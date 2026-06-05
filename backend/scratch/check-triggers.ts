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
    console.log('Querying triggers on orders table...');
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT trigger_name 
       FROM information_schema.triggers 
       WHERE event_object_table = 'orders'`
    );
    console.log('Triggers found:', result);
  } catch (err) {
    console.error('Error querying triggers:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
