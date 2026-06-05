import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    // Load bkash settings
    const rows = await prisma.site_settings.findMany({
      where: { key: { startsWith: 'bkash_' } },
    });
    
    const s: Record<string, string> = {};
    rows.forEach((row) => {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value);
      s[row.key] = val;
    });

    console.log('Loaded Settings:', {
      username: s.bkash_username,
      app_key: s.bkash_app_key ? `${s.bkash_app_key.slice(0, 5)}...` : undefined,
      sandbox: s.bkash_sandbox,
    });

    const urls = [
      { name: 'Sandbox', url: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' },
      { name: 'Live', url: 'https://tokenized.pay.bka.sh/v1.2.0-beta' },
    ];

    for (const item of urls) {
      console.log(`\nGranting token via ${item.name} (${item.url})...`);
      const res = await fetch(`${item.url}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          username: s.bkash_username,
          password: s.bkash_password,
        },
        body: JSON.stringify({ app_key: s.bkash_app_key, app_secret: s.bkash_app_secret }),
      });

      const data = await res.json().catch(() => ({}));
      console.log(`${item.name} Response Status:`, res.status);
      console.log(`${item.name} Response Data:`, data);
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
