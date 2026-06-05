import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Referral Conversion Summary ===');
    
    const total = await prisma.referrals.count();
    const converted = await prisma.referrals.count({ where: { converted: true } });
    const unconverted = await prisma.referrals.count({ where: { converted: false } });

    console.log(`Total Clicks: ${total}`);
    console.log(`Converted Clicks: ${converted}`);
    console.log(`Unconverted Clicks: ${unconverted}`);

    // Group referrals by order_id
    const grouped = await prisma.referrals.groupBy({
      by: ['order_id'],
      _count: {
        id: true
      }
    });

    console.log('\nClicks grouped by order_id:');
    for (const group of grouped) {
      console.log(`  Order ID: ${group.order_id || 'NULL (Unconverted)'} -> Clicks: ${group._count.id}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
