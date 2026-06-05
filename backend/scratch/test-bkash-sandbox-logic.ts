import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

function isBkashSandbox(settings: Record<string, string>): boolean {
  // Simulate missing bkash_sandbox setting to test fallback behavior
  const user = settings.bkash_username || '';
  const key = settings.bkash_app_key || '';
  console.log('user startsWith "01":', user.startsWith('01'), JSON.stringify(user));
  console.log('key startsWith "bkash":', key.startsWith('bkash'), JSON.stringify(key));
  return !user.startsWith('01') && !key.startsWith('bkash');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.site_settings.findMany({
      where: { key: { startsWith: 'bkash_' } },
    });
    
    const s: Record<string, string> = {};
    rows.forEach((row) => {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value);
      s[row.key] = val;
    });

    console.log('isBkashSandbox evaluates to:', isBkashSandbox(s));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
