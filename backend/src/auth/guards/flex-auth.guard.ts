/**
 * FlexAuthGuard — validates both NestJS-issued tokens (JWT_ACCESS_SECRET) and
 * Supabase access tokens (decode-then-db-check) so the strangler-fig backend
 * can serve the frontend while it still uses Supabase auth.
 *
 * NestJS token: verified with JWT_ACCESS_SECRET; payload must have type=access.
 * Supabase token: decoded without signature verification; user's existence is
 * confirmed in auth.users and expiry is enforced. Roles come from user_roles.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../types/auth-user';

@Injectable()
export class FlexAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    const authHeader = req.headers['authorization'] ?? '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    if (!token) throw new UnauthorizedException();

    // ── Strategy 1: NestJS token ──────────────────────────────────────────
    try {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        roles: string[];
        type: string;
      }>(token, { secret });

      if (payload.type === 'access' && payload.sub) {
        req.user = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles ?? [],
        };
        return true;
      }
    } catch {
      // fall through to Supabase strategy
    }

    // ── Strategy 2: Supabase JWT (decode + DB verify + roles lookup) ──────
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('not a JWT');

      const rawPayload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      ) as { sub?: string; email?: string; exp?: number; role?: string };

      if (!rawPayload.sub) throw new UnauthorizedException('no sub');
      if (!rawPayload.exp || rawPayload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }

      // Confirm user still exists in auth.users
      const users = await this.prisma.$queryRawUnsafe<{ id: string }[]>(
        'SELECT id FROM auth.users WHERE id = $1 LIMIT 1',
        rawPayload.sub,
      );
      if (!users.length) throw new UnauthorizedException('User not found');

      // Fetch roles from user_roles
      const roleRows = await this.prisma.$queryRawUnsafe<{ role: string }[]>(
        'SELECT role FROM public.user_roles WHERE user_id = $1',
        rawPayload.sub,
      );

      req.user = {
        id: rawPayload.sub,
        email: rawPayload.email ?? null,
        roles: roleRows.map((r) => r.role),
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException();
    }
  }
}
