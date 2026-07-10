import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRoles } from '../auth/auth.constants';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfileById(id: string) {
    return this.prisma.profiles.findUnique({ where: { id } });
  }

  findProfileByEmail(email: string) {
    return this.prisma.profiles.findFirst({
      where: { email },
    });
  }

  async findProfileByPhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return null;
    const last8 = digits.slice(-8);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.id AS user_id, p.full_name AS name, p.email
      FROM orders o
      JOIN profiles p ON p.id = o.user_id
      WHERE o.user_id IS NOT NULL
        AND length(regexp_replace(coalesce(o.billing_address->>'phone', ''), '\\\\D', '', 'g')) >= 6
    `;
    const found = rows.find((r) => r.phone && r.phone.replace(/\D/g, '').endsWith(last8));
    if (!found) return null;
    return {
      userId: found.user_id,
      name: found.name,
      email: found.email,
    };
  }

  async listProfiles(params: { skip: number; take: number; search?: string }) {
    const where: Prisma.profilesWhereInput = params.search
      ? {
          OR: [
            { email: { contains: params.search } },
            { full_name: { contains: params.search } },
          ],
        }
      : {};

    const [profiles, adminUsers, total] = await this.prisma.$transaction([
      this.prisma.profiles.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.admin_users.findMany({}),
      this.prisma.profiles.count({ where }),
    ]);

    // Fetch order counts
    const orderCounts = await this.prisma.orders.groupBy({
      by: ['user_id'],
      _count: {
        id: true,
      },
      where: {
        user_id: { in: profiles.map((p) => p.id) },
      },
    });

    const orderCountMap = new Map<string, number>();
    for (const c of orderCounts) {
      if (c.user_id) {
        orderCountMap.set(c.user_id, c._count.id);
      }
    }

    const data = profiles.map((p) => {
      const adminUser = adminUsers.find((u) => u.email.toLowerCase() === p.email.toLowerCase());
      const primaryRole = adminUser ? adminUser.role : 'editor';
      return {
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: primaryRole,
        created_at: p.created_at,
        last_sign_in_at: adminUser?.updated_at ?? null,
        email_confirmed_at: adminUser?.created_at ?? null,
        order_count: orderCountMap.get(p.id) ?? 0,
      };
    });

    return { data, total };
  }

  async createUser(data: {
    id: string;
    email: string;
    passwordHash: string;
    full_name: string;
    role?: string;
  }) {
    const existing = await this.prisma.admin_users.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create admin user
      const user = await tx.admin_users.create({
        data: {
          name: data.full_name,
          email: data.email.toLowerCase(),
          password: data.passwordHash,
          role: (data.role || 'editor') as any,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      });

      const stringUserId = String(user.id);

      // 2. Create profile
      await tx.profiles.create({
        data: {
          id: stringUserId,
          email: data.email.toLowerCase(),
          full_name: data.full_name,
          created_at: now,
          updated_at: now,
        },
      });

      return {
        id: stringUserId,
        email: user.email,
        raw_user_meta_data: {
          full_name: user.name,
        },
      };
    });
  }

  async deleteUser(id: string) {
    if (!isNaN(Number(id))) {
      await this.prisma.admin_users.delete({
        where: { id: BigInt(id) },
      });
    }
    try {
      await this.prisma.profiles.delete({
        where: { id },
      });
    } catch {}
    return { id };
  }

  async updateUserRole(userId: string, role?: string) {
    if (!isNaN(Number(userId)) && role) {
      await this.prisma.admin_users.update({
        where: { id: BigInt(userId) },
        data: {
          role: role as any,
          updated_at: new Date(),
        },
      });
    }
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    if (!isNaN(Number(userId))) {
      await this.prisma.admin_users.update({
        where: { id: BigInt(userId) },
        data: {
          password: passwordHash,
          updated_at: new Date(),
        },
      });
    }
    return { id: userId };
  }

  async rolesForUser(id: string) {
    if (!isNaN(Number(id))) {
      const user = await this.prisma.admin_users.findUnique({
        where: { id: BigInt(id) },
      });
      if (user) {
        return [{ role: user.role }];
      }
    }
    return [];
  }

  async updateProfile(id: string, data: any) {
    return this.prisma.profiles.update({
      where: { id },
      data: {
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        updated_at: new Date(),
      },
    });
  }
}
