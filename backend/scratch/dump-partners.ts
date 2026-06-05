import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpPartners() {
  const prisma = new PrismaClient();
  try {
    const partners = await prisma.partners.findMany({});
    console.log(`Found ${partners.length} partners.`);
    for (const p of partners) {
      console.log(JSON.stringify(p, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

dumpPartners();
