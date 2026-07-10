import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function mapAdminUserToUser(adminUser: any) {
  if (!adminUser) return null;
  return {
    id: String(adminUser.id),
    email: adminUser.email,
    encrypted_password: adminUser.password,
    role: adminUser.role,
    aud: 'authenticated',
    created_at: adminUser.created_at,
    updated_at: adminUser.updated_at,
    banned_until: null,
    email_confirmed_at: adminUser.created_at,
    last_sign_in_at: adminUser.updated_at,
  };
}

function cleanWhere(where: any) {
  if (!where) return where;
  const newWhere = { ...where };
  if (newWhere.id && typeof newWhere.id === 'string') {
    // If it's a UUID string, check if it's a numeric string first
    if (!isNaN(Number(newWhere.id))) {
      newWhere.id = BigInt(newWhere.id);
    } else {
      // If it's a true UUID string, it won't be in the admin_users table (numeric IDs),
      // so we use a non-existent BigInt ID (like -1) to prevent query errors but return empty
      newWhere.id = -1n;
    }
  }
  if (newWhere.id && typeof newWhere.id === 'object' && newWhere.id.in) {
    newWhere.id = { in: newWhere.id.in.map((id: any) => !isNaN(Number(id)) ? BigInt(id) : -1n) };
  }
  if (newWhere.email && typeof newWhere.email === 'object' && newWhere.email.equals) {
    newWhere.email = newWhere.email.equals; // strip 'mode: insensitive'
  }
  return newWhere;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private static rawInstance: PrismaService;

  constructor() {
    const url = process.env.DATABASE_URL;
    super({ datasources: { db: { url } } });
    PrismaService.rawInstance = this;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // --- Virtual Users and UserRoles wrappers to bridge Laravel database ---
  get users(): any {
    const self = PrismaService.rawInstance || this;
    return {
      async findFirst(args: any = {}) {
        const where = cleanWhere(args.where);
        const user = await self.admin_users.findFirst({ ...args, where });
        return mapAdminUserToUser(user);
      },
      async findUnique(args: any = {}) {
        const where = cleanWhere(args.where);
        const user = await self.admin_users.findUnique({ ...args, where });
        return mapAdminUserToUser(user);
      },
      async findMany(args: any = {}) {
        const where = cleanWhere(args.where);
        const users = await self.admin_users.findMany({ ...args, where });
        return users.map(mapAdminUserToUser);
      },
      async create(args: any = {}) {
        const data = args.data || {};
        const password = data.encrypted_password || data.password || '';
        const role = data.role || 'editor';
        const user = await self.admin_users.create({
          data: {
            name: data.email ? data.email.split('@')[0] : 'User',
            email: data.email,
            password: password,
            role: role,
            is_active: true,
          }
        });
        return mapAdminUserToUser(user);
      },
      async update(args: any = {}) {
        const where = cleanWhere(args.where);
        const data = args.data || {};
        const updateData: any = {};
        if (data.encrypted_password) updateData.password = data.encrypted_password;
        if (data.password) updateData.password = data.password;
        if (data.email) updateData.email = data.email;
        if (data.role) updateData.role = data.role;
        const user = await self.admin_users.update({
          where,
          data: updateData
        });
        return mapAdminUserToUser(user);
      },
      async delete(args: any = {}) {
        const where = cleanWhere(args.where);
        const user = await self.admin_users.delete({ where });
        return mapAdminUserToUser(user);
      },
      async count(args: any = {}) {
        const where = cleanWhere(args.where);
        return self.admin_users.count({ ...args, where });
      }
    };
  }

  get user_roles(): any {
    const self = PrismaService.rawInstance || this;
    return {
      async findMany(args: any = {}) {
        const where = cleanWhere(args.where);
        if (where && where.user_id) {
          const userIdNum = Number(where.user_id);
          if (!isNaN(userIdNum)) {
            const user = await self.admin_users.findUnique({
              where: { id: BigInt(userIdNum) }
            });
            if (user) {
              return [{ role: user.role }];
            }
          }
        }
        return [];
      },
      async upsert(args: any = {}) {
        // Mock upsert
        return { role: 'editor' };
      },
      async create(args: any = {}) {
        const data = args.data || {};
        if (data.user_id && data.role) {
          const userIdNum = Number(data.user_id);
          if (!isNaN(userIdNum)) {
            await self.admin_users.update({
              where: { id: BigInt(userIdNum) },
              data: { role: data.role }
            });
          }
        }
        return data;
      },
      async deleteMany(args: any = {}) {
        return { count: 1 };
      }
    };
  }
}
