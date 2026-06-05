import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const userRoles = await prisma.user_roles.findMany({
      where: {
        role: {
          in: ['super_admin', 'manager', 'sales', 'support'] as any
        }
      },
      select: {
        user_id: true,
        role: true
      }
    });

    console.log('--- Admin User Roles ---');
    console.log(userRoles);

    for (const r of userRoles) {
      const u = await prisma.users.findUnique({
        where: { id: r.user_id }
      });
      console.log(`User: ${u?.email}, Role: ${r.role}, Confirmed: ${u?.confirmed_at}`);
    }

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
