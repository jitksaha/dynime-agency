import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const key = 'bkash_sandbox';
    const value = 'false';

    console.log(`Setting site_settings ${key} to ${value}...`);
    await prisma.site_settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    console.log('SUCCESS! Setting updated.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
