import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { sanitizeRoles } from '../auth/auth.constants';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getProfile(id: string) {
    const profile = await this.repo.findProfileById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    const roles = await this.repo.rolesForUser(id);
    const dbRoles = roles.map((r) => r.role);
    return { ...profile, roles: sanitizeRoles(profile.email, dbRoles) };
  }

  async getProfileByEmail(email: string) {
    const profile = await this.repo.findProfileByEmail(email);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async getProfileByPhone(phone: string) {
    const profile = await this.repo.findProfileByPhone(phone);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateOwnProfile(id: string, dto: UpdateProfileDto) {
    await this.getProfile(id);
    return this.repo.updateProfile(id, dto);
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50; // Increased limit default to show more users
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

  async adminCreateUser(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = randomUUID();
    return this.repo.createUser({
      id: userId,
      email: dto.email,
      passwordHash,
      full_name: dto.full_name,
      role: dto.role,
    });
  }

  async adminDeleteUser(userId: string) {
    const profile = await this.repo.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return this.repo.deleteUser(userId);
  }

  async adminUpdateUserRole(userId: string, role?: string) {
    const profile = await this.repo.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return this.repo.updateUserRole(userId, role);
  }

  async adminResetUserPassword(userId: string, passwordPlan: string) {
    const profile = await this.repo.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    const passwordHash = await bcrypt.hash(passwordPlan, 10);
    return this.repo.updateUserPassword(userId, passwordHash);
  }
}
