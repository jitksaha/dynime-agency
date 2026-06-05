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
    // 1. List all tables
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('--- Tables ---');
    console.log(tables.map((t) => t.table_name).join(', '));

    // 2. Query notification_settings
    console.log('\n--- Notification Settings ---');
    const settings = await prisma.notification_settings.findMany();
    console.log(JSON.stringify(settings, null, 2));

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
