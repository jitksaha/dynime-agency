import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getProfile(id: string) {
    const profile = await this.repo.findProfileById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    const roles = await this.repo.rolesForUser(id);
    return { ...profile, roles: roles.map((r) => r.role) };
  }

  async updateOwnProfile(id: string, dto: UpdateProfileDto) {
    await this.getProfile(id);
    return this.repo.updateProfile(id, dto);
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.repo.listProfiles({
      skip: (page - 1) * limit,
      take: limit,
      search: query.search,
    });
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
