import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfileById(id: string) {
    return this.prisma.profiles.findUnique({ where: { id } });
  }

  updateProfile(id: string, data: Prisma.profilesUpdateInput) {
    return this.prisma.profiles.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  rolesForUser(userId: string) {
    return this.prisma.user_roles.findMany({
      where: { user_id: userId },
      select: { role: true },
    });
  }

  async listProfiles(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.profilesWhereInput = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' } },
            { full_name: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.profiles.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.profiles.count({ where }),
    ]);

    return { data, total };
  }
}
