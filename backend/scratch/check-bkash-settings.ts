import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.site_settings.findMany({
      where: {
        key: {
          contains: 'bkash',
          mode: 'insensitive',
        },
      },
      orderBy: { key: 'asc' },
    });
    console.log('--- BKASH SETTINGS ---');
    rows.forEach(row => {
      console.log(`${row.key}: ${JSON.stringify(row.value)}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
