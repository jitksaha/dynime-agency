import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { app_refresh_tokens } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RequestContext {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  deviceLabel?: string | null;
}

export interface TokenUser {
  id: string;
  email: string | null;
  roles: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) {
    return 900;
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return amount * multipliers[unit];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessSecret(): string {
    return this.config.get<string>('jwt.accessSecret') as string;
  }

  private get accessTtl(): string {
    return this.config.get<string>('jwt.accessTtl') ?? '15m';
  }

  private get refreshTtl(): string {
    return this.config.get<string>('jwt.refreshTtl') ?? '30d';
  }

  accessTtlSeconds(): number {
    return parseDurationSeconds(this.accessTtl);
  }

  refreshTtlSeconds(): number {
    return parseDurationSeconds(this.refreshTtl);
  }

  hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  signAccessToken(user: TokenUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, roles: user.roles, type: 'access' },
      { secret: this.accessSecret, expiresIn: this.accessTtl },
    );
  }

  private async persistRefresh(
    userId: string,
    familyId: string,
    ctx?: RequestContext,
  ): Promise<{ raw: string; row: app_refresh_tokens }> {
    const raw = randomBytes(48).toString('base64url');
    const row = await this.prisma.app_refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(raw),
        family_id: familyId,
        expires_at: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
        device_id: ctx?.deviceId ?? null,
        device_label: ctx?.deviceLabel ?? null,
        user_agent: ctx?.userAgent ?? null,
        ip_address: ctx?.ip ?? null,
      },
    });
    return { raw, row };
  }

  private shape(accessToken: string, refreshToken: string): TokenResponse {
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtlSeconds(),
    };
  }

  async issueNewSession(
    user: TokenUser,
    ctx?: RequestContext,
  ): Promise<{ response: TokenResponse; refreshTokenId: string }> {
    const familyId = randomUUID();
    const accessToken = await this.signAccessToken(user);
    const { raw, row } = await this.persistRefresh(user.id, familyId, ctx);
    return { response: this.shape(accessToken, raw), refreshTokenId: row.id };
  }

  /**
   * Atomically rotate a refresh token. The old row is claimed with a
   * compare-and-set on `revoked_at IS NULL` so concurrent refreshes cannot both
   * succeed. Returns null when the claim fails (token already rotated/revoked),
   * which the caller treats as reuse/theft.
   */
  async rotate(
    oldRow: app_refresh_tokens,
    user: TokenUser,
    ctx?: RequestContext,
  ): Promise<{ response: TokenResponse; refreshTokenId: string } | null> {
    const claimed = await this.prisma.app_refresh_tokens.updateMany({
      where: { id: oldRow.id, revoked_at: null },
      data: {
        revoked_at: new Date(),
        revoked_reason: 'rotated',
        last_used_at: new Date(),
      },
    });
    if (claimed.count === 0) {
      return null;
    }

    const accessToken = await this.signAccessToken(user);
    const { raw, row } = await this.persistRefresh(
      user.id,
      oldRow.family_id,
      ctx,
    );
    await this.prisma.app_refresh_tokens.update({
      where: { id: oldRow.id },
      data: { replaced_by: row.id },
    });
    return { response: this.shape(accessToken, raw), refreshTokenId: row.id };
  }

  findByRawToken(raw: string) {
    return this.prisma.app_refresh_tokens.findUnique({
      where: { token_hash: this.hashToken(raw) },
    });
  }

  async revokeFamily(familyId: string, reason: string): Promise<number> {
    const result = await this.prisma.app_refresh_tokens.updateMany({
      where: { family_id: familyId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
    return result.count;
  }

  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.app_refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
    return result.count;
  }
}
