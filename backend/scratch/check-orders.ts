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
    const count = await prisma.orders.count();
    console.log('--- Orders Count ---');
    console.log('Total Orders:', count);

    const sample = await prisma.orders.findFirst({
      orderBy: { created_at: 'desc' }
    });
    console.log('Sample Order:', JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
