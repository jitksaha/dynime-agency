import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Derive a valid Supabase connection URL from SUPABASE_DB_URL, URL-encoding the
 * password (which may contain special characters). Falls back to DATABASE_URL
 * if SUPABASE_DB_URL is not set.
 */
function resolveDbUrl(): string | undefined {
  const raw = process.env.SUPABASE_DB_URL;
  if (!raw) return process.env.DATABASE_URL;

  const s = raw.trim();
  const scheme = s.startsWith('postgresql://')
    ? 'postgresql://'
    : s.startsWith('postgres://')
      ? 'postgres://'
      : null;
  if (!scheme) return process.env.DATABASE_URL;

  const rest = s.slice(scheme.length);
  const user = rest.slice(0, rest.indexOf(':'));
  const afterUser = rest.slice(rest.indexOf(':') + 1);
  const atIdx = afterUser.lastIndexOf('@');
  const password = afterUser.slice(0, atIdx);
  const hostAndAfter = afterUser.slice(atIdx + 1);

  let url = `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostAndAfter}`;
  if (!/[?&]sslmode=/.test(url)) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = resolveDbUrl();
    super({ datasources: { db: { url } } });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
