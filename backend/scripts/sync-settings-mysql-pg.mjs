import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load env variables from backend/.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching settings from MySQL (Laravel)...');
  const laravelDir = path.resolve(__dirname, '../../dynime-api');
  
  let mysqlSettingsJson;
  try {
    mysqlSettingsJson = execSync(
      'php artisan tinker --execute="echo json_encode(DB::table(\'site_settings\')->get());"',
      { cwd: laravelDir, encoding: 'utf8' }
    );
  } catch (error) {
    console.error('Failed to fetch settings from Laravel via Tinker:', error);
    process.exit(1);
  }

  const settings = JSON.parse(mysqlSettingsJson.trim());
  console.log(`Loaded ${settings.length} settings from MySQL.`);

  console.log('Upserting settings to PostgreSQL (NestJS)...');
  for (const s of settings) {
    const key = s.key;
    let value = s.value;
    
    // Parse value if it is stringified JSON, since NestJS value is JSON type
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // keep as string
      }
    }

    await prisma.site_settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  console.log('Synchronization completed successfully!');
}

main()
  .catch((e) => {
    console.error('Sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
