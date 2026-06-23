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
    const settings = await prisma.site_settings.findMany({
      select: {
        key: true,
        value: true
      }
    });
    console.log('--- All Site Settings ---');
    console.log(settings.map(s => `${s.key}: ${s.value}`));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
