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
    console.log('Checking if partner role exists in app_role enum...');
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 1 FROM pg_enum 
       WHERE enumlabel = 'partner' 
         AND enumtypid = 'public.app_role'::regtype`
    );

    if (result.length === 0) {
      console.log("Adding 'partner' value to app_role enum...");
      // ALTER TYPE cannot run inside transaction blocks, prisma.$executeRawUnsafe runs it directly
      await prisma.$executeRawUnsafe(`ALTER TYPE public.app_role ADD VALUE 'partner'`);
      console.log("Successfully added 'partner' to app_role enum.");
    } else {
      console.log("'partner' role already exists in app_role enum.");
    }
  } catch (err) {
    console.error('Error altering enum:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
