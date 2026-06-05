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
    console.log('Querying notification_settings for smtp_config...');
    const setting = await prisma.notification_settings.findUnique({
      where: { key: 'smtp_config' }
    });

    if (setting) {
      console.log('SMTP Config found:', JSON.stringify(setting, null, 2));
    } else {
      console.log('SMTP Config not found in database!');
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
