import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  const profile = {
    id: 'u1',
    email: 'a@b.com',
    full_name: 'Alice',
    avatar_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    repo = {
      findProfileById: jest.fn(),
      updateProfile: jest.fn(),
      rolesForUser: jest.fn(),
      listProfiles: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new UsersService(repo);
  });

  it('returns profile with roles', async () => {
    repo.findProfileById!.mockResolvedValue(profile as any);
    repo.rolesForUser!.mockResolvedValue([{ role: 'super_admin' }] as any);

    const result = await service.getProfile('u1');
    expect(result.id).toBe('u1');
    expect(result.roles).toEqual(['super_admin']);
  });

  it('throws when profile missing', async () => {
    repo.findProfileById!.mockResolvedValue(null as any);
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates own profile after existence check', async () => {
    repo.findProfileById!.mockResolvedValue(profile as any);
    repo.rolesForUser!.mockResolvedValue([] as any);
    repo.updateProfile!.mockResolvedValue({
      ...profile,
      full_name: 'Bob',
    } as any);

    const result = await service.updateOwnProfile('u1', { full_name: 'Bob' });
    expect(repo.updateProfile).toHaveBeenCalledWith('u1', { full_name: 'Bob' });
    expect(result.full_name).toBe('Bob');
  });

  it('paginates user list', async () => {
    repo.listProfiles!.mockResolvedValue({
      data: [profile] as any,
      total: 1,
    });
    const result = await service.listUsers({ page: 1, limit: 20 });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    });
  });
});
