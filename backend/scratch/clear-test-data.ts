import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  
  console.log('=== Dynime OS Referral Data Reset Tool ===');

  try {
    const partner = await prisma.partners.findUnique({
      where: { referral_code: 'JITKUMS' },
    });

    if (!partner) {
      console.log('No JITKUMS partner found. Database is already clean.');
      return;
    }

    console.log(`Resetting data for partner: ${partner.name} (${partner.referral_code})`);

    // 1. Delete all commissions for this partner
    const commissionsDelete = await prisma.commissions.deleteMany({
      where: { partner_id: partner.id }
    });
    console.log(`✔ Deleted ${commissionsDelete.count} commissions.`);

    // 2. Delete all referrals (clicks) for this partner
    const referralsDelete = await prisma.referrals.deleteMany({
      where: { partner_id: partner.id }
    });
    console.log(`✔ Deleted ${referralsDelete.count} clicks/referral logs.`);

    // 3. Reset partner accumulators back to zero
    await prisma.partners.update({
      where: { id: partner.id },
      data: {
        commission_earned: 0,
        commission_paid: 0,
        total_referrals: 0,
        total_sales: 0
      }
    });
    console.log('✔ Reset partner statistics to 0.');

    // 4. Remove referral code from orders to keep them clean
    const ordersUpdate = await prisma.orders.updateMany({
      where: { referral_code: partner.referral_code },
      data: { referral_code: null }
    });
    console.log(`✔ Unlinked referral code from ${ordersUpdate.count} orders.`);

    console.log('\n======================================================');
    console.log('🎉 REFERRAL DATABASE SUCCESSFULLY RESET TO CLEAN STATE!');
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Data reset failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
