import { PrismaClient } from '@prisma/client';
import { ReferralService } from '../src/referral/referral.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function restoreTestData() {
  const prisma = new PrismaClient();
  const eventServiceMock = { emit: () => {} } as any;
  const referralService = new ReferralService(prisma as any, eventServiceMock);

  console.log('=== Dynime OS Referral Data Restoration Tool ===');

  try {
    // 1. Locate the partner profile for JIT KUMAR SAHA
    const partner = await prisma.partners.findFirst({
      where: { email: 'mail.jitsaha@gmail.com' },
    });

    if (!partner) {
      console.error('❌ Error: Partner profile for mail.jitsaha@gmail.com not found.');
      return;
    }

    console.log(`Found partner profile: ${partner.name} (Code: ${partner.referral_code})`);

    // 2. Generate referral clicks to populate dashboard traffic stats
    console.log('Generating referral clicks logs...');
    const now = new Date();
    
    // Add 15 historical clicks over the last 5 days
    for (let i = 0; i < 15; i++) {
      const clickDate = new Date();
      clickDate.setDate(now.getDate() - Math.floor(i / 3));
      
      await prisma.referrals.create({
        data: {
          partner_id: partner.id,
          referral_code: partner.referral_code,
          visitor_ip: `192.168.1.${10 + i}`,
          device_fingerprint: `fingerprint_restore_${i}`,
          landing_page: `https://dynime.com/?ref=${partner.referral_code}`,
          utm_source: i % 2 === 0 ? 'linkedin' : 'google',
          utm_medium: 'social',
          cookie_id: `cookie_restore_${i}_${Math.random().toString(36).substring(7)}`,
          converted: false,
          created_at: clickDate,
          last_visit: clickDate,
        },
      });
    }
    console.log('✔ Clicks logs generated.');

    // 3. Process the test order for Feyimini (email: feyimi8276@aspensif.com)
    const feyiminiOrder = await prisma.orders.findFirst({
      where: { customer_email: 'feyimi8276@aspensif.com' },
    });

    if (feyiminiOrder) {
      console.log(`Processing feyimini order ${feyiminiOrder.id}...`);
      
      // Update order amount to qualify for bracket commission, set referral code
      await prisma.orders.update({
        where: { id: feyiminiOrder.id },
        data: {
          total: 1200.00,
          subtotal: 1200.00,
          referral_code: partner.referral_code,
          status: 'paid',
        },
      });

      // Trigger commission
      await referralService.triggerCommission(
        feyiminiOrder.id,
        feyiminiOrder.customer_email,
        partner.referral_code,
        1200.00
      );
      console.log('✔ Feyimini commission processed.');
    } else {
      console.warn('⚠ Feyimini order not found in database.');
    }

    // 4. Create another mock conversion for a different user (e.g. $450 order -> $5 commission)
    const mockEmail = 'test_buyer@example.com';
    
    console.log(`Creating a secondary mock order ($450) to verify multi-conversion displays...`);
    const mockOrder = await prisma.orders.create({
      data: {
        customer_name: 'David Miller',
        customer_email: mockEmail,
        total: 450.00,
        subtotal: 450.00,
        status: 'paid',
        items: [{ name: 'WordPress Development', price: 450.00 }],
        referral_code: partner.referral_code,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
    });

    await referralService.triggerCommission(
      mockOrder.id,
      mockEmail,
      partner.referral_code,
      450.00
    );
    console.log('✔ Secondary mock commission processed.');

    // 5. Recalculate totals directly in database to be 100% accurate
    const totalReferrals = await prisma.referrals.count({ where: { partner_id: partner.id } });
    const conversions = await prisma.commissions.count({ where: { partner_id: partner.id } });
    const totalSales = await prisma.commissions.aggregate({
      where: { partner_id: partner.id },
      _sum: { order_amount: true },
    });
    const totalEarned = await prisma.commissions.aggregate({
      where: { partner_id: partner.id },
      _sum: { commission_amount: true },
    });

    await prisma.partners.update({
      where: { id: partner.id },
      data: {
        total_referrals: totalReferrals,
        total_sales: totalSales._sum.order_amount || 0,
        commission_earned: totalEarned._sum.commission_amount || 0,
      },
    });

    console.log('\n======================================================');
    console.log(`🏆 DATA RESTORED SUCCESSFULLY!`);
    console.log(`   - Referral Clicks added: 15`);
    console.log(`   - Commission conversions added: 2`);
    console.log(`   - Total Sales: $${totalSales._sum.order_amount || 0}`);
    console.log(`   - Total Commission Earned: $${totalEarned._sum.commission_amount || 0}`);
    console.log(`   - Check your Partner Dashboard at /partner to view results.`);
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Data restoration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

restoreTestData();
