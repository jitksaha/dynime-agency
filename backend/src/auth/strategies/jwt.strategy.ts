import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from '../types/auth-user';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeRoles } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub || payload.type === 'refresh') {
      throw new UnauthorizedException();
    }

    // Confirm user still exists in auth.users
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Fetch roles from user_roles
    const roleRows = await this.prisma.user_roles.findMany({
      where: { user_id: payload.sub },
    });

    return {
      id: payload.sub,
      email: payload.email ?? null,
      roles: sanitizeRoles(payload.email, roleRows.map((r) => r.role)),
    };
  }
}
