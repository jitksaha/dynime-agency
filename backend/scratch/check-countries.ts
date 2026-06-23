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
    const countries = await prisma.country_eligibility.findMany({
      orderBy: { sort_order: 'asc' }
    });
    console.log(`Total countries in DB: ${countries.length}`);
    
    const notEligible = countries.filter(c => !c.is_active || c.status !== 'eligible');
    console.log(`Not eligible or inactive countries count: ${notEligible.length}`);
    console.log('Not eligible or inactive countries detail:', notEligible.map(c => `${c.name} (active: ${c.is_active}, status: ${c.status})`));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
