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
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  async findProfileByPhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return null;
    const last8 = digits.slice(-8);

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.id AS "user_id", p.full_name AS "name", p.email
      FROM public.orders o
      JOIN public.profiles p ON p.id = o.user_id
      WHERE o.user_id IS NOT NULL
        AND length(regexp_replace(coalesce(o.billing_address->>'phone', ''), '\\D', '', 'g')) >= 6
        AND right(regexp_replace(coalesce(o.billing_address->>'phone', ''), '\\D', '', 'g'), 8) = ${last8}
      ORDER BY o.created_at DESC
      LIMIT 1
    `;

    return rows.length ? rows[0] : null;
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

    const [profiles, total] = await this.prisma.$transaction([
      this.prisma.profiles.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              last_sign_in_at: true,
              email_confirmed_at: true,
              user_roles: {
                select: {
                  role: true,
                },
              },
            },
          },
        },
      }),
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
      const roles = p.users?.user_roles ?? [];
      const dbRoles = roles.map((r) => r.role);
      const sanitized = sanitizeRoles(p.email, dbRoles);
      const primaryRole = sanitized.length > 0 ? sanitized[0] : null;
      return {
        user_id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: primaryRole,
        created_at: p.created_at,
        last_sign_in_at: p.users?.last_sign_in_at ?? null,
        email_confirmed_at: p.users?.email_confirmed_at ?? null,
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
    const existing = await this.prisma.users.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const now = new Date();
    const SUPABASE_INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create auth user
      const user = await tx.users.create({
        data: {
          id: data.id,
          instance_id: SUPABASE_INSTANCE_ID,
          aud: 'authenticated',
          role: 'authenticated',
          email: data.email.toLowerCase(),
          encrypted_password: data.passwordHash,
          email_confirmed_at: now,
          raw_app_meta_data: { provider: 'email', providers: ['email'] },
          raw_user_meta_data: {
            full_name: data.full_name,
            email_verified: true,
          },
          created_at: now,
          updated_at: now,
        },
      });

      // 2. Double-check profile creation (if DB trigger created it, let's update it. Otherwise, create it)
      const existingProfile = await tx.profiles.findUnique({
        where: { id: data.id },
      });

      if (existingProfile) {
        await tx.profiles.update({
          where: { id: data.id },
          data: {
            email: data.email.toLowerCase(),
            full_name: data.full_name,
            updated_at: now,
          },
        });
      } else {
        await tx.profiles.create({
          data: {
            id: data.id,
            email: data.email.toLowerCase(),
            full_name: data.full_name,
            created_at: now,
            updated_at: now,
          },
        });
      }

      // 3. Assign role if specified
      if (data.role) {
        await tx.user_roles.create({
          data: {
            user_id: data.id,
            role: data.role as any,
            created_at: now,
          },
        });
      }

      return user;
    });
  }

  async deleteUser(id: string) {
    // Delete from auth.users cascades into profiles, user_roles, etc.
    return this.prisma.users.delete({ where: { id } });
  }

  async updateUserRole(userId: string, role?: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      // Remove all existing roles
      await tx.user_roles.deleteMany({ where: { user_id: userId } });

      // Add new role if specified
      if (role && role.trim() !== '') {
        await tx.user_roles.create({
          data: {
            user_id: userId,
            role: role as any,
            created_at: now,
          },
        });
      }
    });
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    return this.prisma.users.update({
      where: { id: userId },
      data: {
        encrypted_password: passwordHash,
        updated_at: new Date(),
      },
    });
  }
}
