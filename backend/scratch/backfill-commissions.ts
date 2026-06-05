import { PrismaClient } from '@prisma/client';
import { ReferralService } from '../src/referral/referral.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function backfillCommissions() {
  const prisma = new PrismaClient();
  const eventServiceMock = { emit: () => {} } as any;
  const referralService = new ReferralService(prisma as any, eventServiceMock);

  console.log('=== Dynime OS Referral Commission Backfill Tool ===');

  try {
    // 1. Fetch all paid/completed orders with a referral code
    const orders = await prisma.orders.findMany({
      where: {
        referral_code: { not: null },
        status: { in: ['paid', 'completed', 'verified'] },
      },
      orderBy: { created_at: 'asc' },
    });

    console.log(`Found ${orders.length} total paid/completed orders with a referral code.`);

    let backfilledCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const code = order.referral_code?.trim();
      if (!code) continue;

      // 2. Check if a commission record already exists for this order
      const existingCommission = await prisma.commissions.findFirst({
        where: { order_id: order.id },
      });

      if (existingCommission) {
        console.log(`[Skip] Order ${order.id} (${order.invoice_number || 'No Invoice'}) already has a commission record.`);
        skippedCount++;
        continue;
      }

      // 3. Check if referral partner exists for this code
      const partner = await prisma.partners.findFirst({
        where: { referral_code: { equals: code, mode: 'insensitive' } },
      });

      if (!partner) {
        console.warn(`[Warning] No active partner found matching code "${code}" for order ${order.id}. Skipping.`);
        skippedCount++;
        continue;
      }

      // 4. Trigger commission retroactively
      console.log(`[Backfill] Processing order ${order.id} ($${order.total}) for partner "${partner.name}" (Code: ${partner.referral_code})...`);
      
      try {
        // Run triggerCommission
        await referralService.triggerCommission(
          order.id,
          order.customer_email,
          code,
          Number(order.total)
        );
        console.log(`   ✔ Commission successfully generated for order ${order.id}.`);
        backfilledCount++;
      } catch (triggerErr: any) {
        console.error(`   ❌ Failed to generate commission for order ${order.id}:`, triggerErr.message || triggerErr);
      }
    }

    console.log('\n======================================================');
    console.log(`🏆 BACKFILL COMPLETED SUCCESSFULY!`);
    console.log(`   - Backfilled: ${backfilledCount} orders`);
    console.log(`   - Skipped: ${skippedCount} orders`);
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

backfillCommissions();
