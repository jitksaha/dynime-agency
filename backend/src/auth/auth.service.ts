import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext, TokenService, TokenUser } from './token.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { sanitizeRoles } from './auth.constants';

const SUPABASE_INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private async getRoles(userId: string, email: string | null): Promise<string[]> {
    const rows = await this.prisma.user_roles.findMany({
      where: { user_id: userId },
      select: { role: true },
    });
    const dbRoles = rows.map((r) => r.role);
    return sanitizeRoles(email, dbRoles);
  }

  private async audit(params: {
    event: string;
    userId?: string | null;
    ctx?: RequestContext;
    metadata?: Record<string, unknown>;
    tokenId?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.app_auth_audit_log.create({
        data: {
          event_type: params.event,
          user_id: params.userId ?? null,
          token_id: params.tokenId ?? null,
          ip_address: params.ctx?.ip ?? null,
          user_agent: params.ctx?.userAgent ?? null,
          metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write auth audit log: ${String(err)}`);
    }
  }

  private toPublicUser(user: TokenUser) {
    return { id: user.id, email: user.email, roles: user.roles };
  }

  async login(dto: LoginDto, ctx?: RequestContext) {
    const user = await this.prisma.users.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    if (!user || !user.encrypted_password) {
      await this.audit({
        event: 'login_failure',
        userId: user?.id,
        ctx,
        metadata: { email: dto.email, reason: 'no_user' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.banned_until && user.banned_until > new Date()) {
      await this.audit({
        event: 'login_failure',
        userId: user.id,
        ctx,
        metadata: { reason: 'banned' },
      });
      // Generic message: do not reveal account status to callers.
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.encrypted_password);
    if (!valid) {
      await this.audit({
        event: 'login_failure',
        userId: user.id,
        ctx,
        metadata: { reason: 'bad_password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = await this.getRoles(user.id, user.email);
    const tokenUser: TokenUser = { id: user.id, email: user.email, roles };
    const issued = await this.tokens.issueNewSession(tokenUser, ctx);
    await this.audit({
      event: 'login_success',
      userId: user.id,
      ctx,
      tokenId: issued.refreshTokenId,
    });

    return { ...issued.response, user: this.toPublicUser(tokenUser) };
  }

  async register(dto: RegisterDto, ctx?: RequestContext) {
    const existing = await this.prisma.users.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    const created = await this.prisma.users.create({
      data: {
        id: randomUUID(),
        instance_id: SUPABASE_INSTANCE_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: dto.email.toLowerCase(),
        encrypted_password: hashed,
        email_confirmed_at: now,
        raw_app_meta_data: { provider: 'email', providers: ['email'] },
        raw_user_meta_data: {
          full_name: dto.full_name ?? '',
          email_verified: true,
        },
        created_at: now,
        updated_at: now,
      },
    });

    // DB triggers (handle_new_user, auto_assign_first_admin) create the
    // public.profiles row and assign the first-admin role automatically.
    const roles = await this.getRoles(created.id, created.email);
    const tokenUser: TokenUser = {
      id: created.id,
      email: created.email,
      roles,
    };
    const issued = await this.tokens.issueNewSession(tokenUser, ctx);
    await this.audit({
      event: 'register',
      userId: created.id,
      ctx,
      tokenId: issued.refreshTokenId,
    });

    return { ...issued.response, user: this.toPublicUser(tokenUser) };
  }

  async refresh(rawToken: string, ctx?: RequestContext) {
    const row = await this.tokens.findByRawToken(rawToken);
    if (!row) {
      await this.audit({
        event: 'token_refresh_failure',
        ctx,
        metadata: { reason: 'unknown_token' },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.revoked_at) {
      // A revoked token was replayed -> assume theft, kill the whole family.
      await this.tokens.revokeFamily(row.family_id, 'reuse_detected');
      await this.audit({
        event: 'token_reuse_detected',
        userId: row.user_id,
        ctx,
        metadata: { family_id: row.family_id },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (row.expires_at < new Date()) {
      await this.audit({
        event: 'token_refresh_failure',
        userId: row.user_id,
        ctx,
        metadata: { reason: 'expired' },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: row.user_id },
    });
    const roles = await this.getRoles(row.user_id, user?.email ?? null);
    const tokenUser: TokenUser = {
      id: row.user_id,
      email: user?.email ?? null,
      roles,
    };

    const issued = await this.tokens.rotate(row, tokenUser, ctx);
    if (!issued) {
      // Atomic claim failed -> the token was concurrently rotated/revoked.
      // Treat as reuse: kill the whole family.
      await this.tokens.revokeFamily(row.family_id, 'reuse_detected');
      await this.audit({
        event: 'token_reuse_detected',
        userId: row.user_id,
        ctx,
        metadata: { family_id: row.family_id, reason: 'concurrent_rotation' },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    await this.audit({
      event: 'token_refresh',
      userId: row.user_id,
      ctx,
      tokenId: issued.refreshTokenId,
    });

    return { ...issued.response, user: this.toPublicUser(tokenUser) };
  }

  async logout(rawToken: string | undefined, userId: string, ctx?: RequestContext) {
    if (!rawToken) {
      // No specific token provided -> nothing to revoke for this device.
      await this.audit({ event: 'logout', userId, ctx });
      return { success: true, revoked: 0 };
    }
    const row = await this.tokens.findByRawToken(rawToken);
    let revoked = 0;
    if (row && row.user_id === userId) {
      revoked = await this.tokens.revokeFamily(row.family_id, 'logout');
    }
    await this.audit({ event: 'logout', userId, ctx, metadata: { revoked } });
    return { success: true, revoked };
  }

  async logoutAll(userId: string, ctx?: RequestContext) {
    const revoked = await this.tokens.revokeAllForUser(userId, 'logout_all');
    await this.audit({
      event: 'logout_all',
      userId,
      ctx,
      metadata: { revoked },
    });
    return { success: true, revoked };
  }

  async requestPasswordReset(email: string, ctx?: RequestContext) {
    const user = await this.prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    // Do not reveal whether the account exists.
    if (user?.encrypted_password) {
      const secret =
        this.config.get<string>('jwt.accessSecret') +
        ':' +
        user.encrypted_password;
      const token = await this.jwt.signAsync(
        { sub: user.id, type: 'password_reset' },
        { secret, expiresIn: '1h' },
      );
      // Email module not built yet. Only surface the raw token in non-production
      // so it never lands in production logs. Real delivery comes with Email.
      if (this.config.get<string>('env') !== 'production') {
        this.logger.log(`[password-reset] token for ${user.email}: ${token}`);
      } else {
        this.logger.log(
          `[password-reset] token generated for user ${user.id} (delivery pending Email module)`,
        );
      }

      const isProd = process.env.NODE_ENV === 'production';
      const origin = isProd ? 'https://dynime.com' : 'http://localhost:5001';
      const resetUrl = `${origin}/auth/reset-password?token=${token}`;

      this.mail.sendTemplateEmail({
        to: user.email!,
        subject: 'Reset Your Password — Dynime',
        templateName: 'password-reset',
        templateData: {
          name: user.raw_user_meta_data ? (user.raw_user_meta_data as any).full_name : '',
          resetUrl,
        },
      }).catch((err) => {
        this.logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
      });

      await this.audit({
        event: 'password_reset_request',
        userId: user.id,
        ctx,
        metadata: { found: true },
      });
    } else {
      await this.audit({
        event: 'password_reset_request',
        ctx,
        metadata: { found: false },
      });
    }

    return {
      success: true,
      message:
        'If an account exists for that email, a password reset token has been generated.',
    };
  }

  async exchangeToken(
    user: { id: string; email: string | null; roles: string[] },
    ctx?: RequestContext,
  ) {
    const tokenUser: TokenUser = { id: user.id, email: user.email, roles: user.roles };
    const issued = await this.tokens.issueNewSession(tokenUser, ctx);
    await this.audit({
      event: 'token_exchange',
      userId: user.id,
      ctx,
      tokenId: issued.refreshTokenId,
    });
    return { ...issued.response, user: this.toPublicUser(tokenUser) };
  }

  async resetPassword(dto: ResetPasswordDto, ctx?: RequestContext) {
    const decoded = this.jwt.decode(dto.token) as
      | { sub?: string; type?: string }
      | null;
    if (!decoded?.sub || decoded.type !== 'password_reset') {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: decoded.sub },
    });
    if (!user?.encrypted_password) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const secret =
      this.config.get<string>('jwt.accessSecret') +
      ':' +
      user.encrypted_password;
    try {
      await this.jwt.verifyAsync(dto.token, { secret });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { encrypted_password: hashed, updated_at: new Date() },
    });

    // Invalidate every existing session after a password change.
    const revoked = await this.tokens.revokeAllForUser(
      user.id,
      'password_reset',
    );
    await this.audit({
      event: 'password_reset',
      userId: user.id,
      ctx,
      metadata: { revoked },
    });

    return { success: true };
  }

  async checkEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
    });
    return { exists: !!user };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.profiles.findUnique({ where: { id: userId } });
    return {
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  }
}
