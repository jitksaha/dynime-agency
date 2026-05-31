import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let tokens: jest.Mocked<TokenService>;

  const tokenResponse = {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };

  beforeEach(() => {
    prisma = {
      users: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      user_roles: { findMany: jest.fn().mockResolvedValue([]) },
      app_auth_audit_log: { create: jest.fn().mockResolvedValue({}) },
    };
    tokens = {
      issueNewSession: jest
        .fn()
        .mockResolvedValue({ response: tokenResponse, refreshTokenId: 't1' }),
      rotate: jest
        .fn()
        .mockResolvedValue({ response: tokenResponse, refreshTokenId: 't2' }),
      findByRawToken: jest.fn(),
      revokeFamily: jest.fn().mockResolvedValue(1),
      revokeAllForUser: jest.fn().mockResolvedValue(2),
    } as unknown as jest.Mocked<TokenService>;
    service = new AuthService(
      prisma as unknown as PrismaService,
      tokens as unknown as TokenService,
      {} as JwtService,
      { get: () => 'secret' } as unknown as ConfigService,
    );
  });

  it('logs in with valid credentials', async () => {
    const hash = await bcrypt.hash('pw12345678', 10);
    prisma.users.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      encrypted_password: hash,
      banned_until: null,
    });
    prisma.user_roles.findMany.mockResolvedValue([{ role: 'support' }]);

    const result = await service.login({
      email: 'a@b.com',
      password: 'pw12345678',
    });
    expect(result.accessToken).toBe('access');
    expect(result.user.roles).toEqual(['support']);
    expect(tokens.issueNewSession).toHaveBeenCalled();
  });

  it('rejects wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    prisma.users.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      encrypted_password: hash,
      banned_until: null,
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown email', async () => {
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@y.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('detects refresh token reuse and revokes the family', async () => {
    tokens.findByRawToken!.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      family_id: 'fam1',
      revoked_at: new Date(),
      expires_at: new Date(Date.now() + 10000),
    } as any);

    await expect(service.refresh('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokens.revokeFamily).toHaveBeenCalledWith('fam1', 'reuse_detected');
  });

  it('rotates a valid refresh token', async () => {
    tokens.findByRawToken!.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      family_id: 'fam1',
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    } as any);
    prisma.users.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    const result = await service.refresh('raw');
    expect(result.refreshToken).toBe('refresh');
    expect(tokens.rotate).toHaveBeenCalled();
  });

  it('treats a failed atomic claim (concurrent rotation) as reuse', async () => {
    tokens.findByRawToken!.mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      family_id: 'fam1',
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    } as any);
    prisma.users.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    tokens.rotate!.mockResolvedValue(null);

    await expect(service.refresh('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokens.revokeFamily).toHaveBeenCalledWith('fam1', 'reuse_detected');
  });
});
