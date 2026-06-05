import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  
  console.log('=== Dynime OS Comprehensive Partner Data Restorer ===');

  try {
    // 1. Locate the partner profile for JITKUMS
    const partner = await prisma.partners.findUnique({
      where: { referral_code: 'JITKUMS' },
    });

    if (!partner) {
      console.error('❌ Error: Partner profile for referral code JITKUMS not found.');
      return;
    }

    console.log(`Found partner profile: ${partner.name} (Code: ${partner.referral_code}, Email: ${partner.email})`);

    // 2. Ensure we have 50 historical clicks spread over the last 30 days
    console.log('Generating 50 historical referral click logs...');
    
    // Clear old click logs first to prevent duplicate pollution of the trend
    const deleteRes = await prisma.referrals.deleteMany({
      where: { partner_id: partner.id }
    });
    console.log(`Cleared ${deleteRes.count} old click logs.`);

    const now = new Date();
    const clicksToCreate: any[] = [];

    for (let i = 0; i < 50; i++) {
      const clickDate = new Date();
      // Distribute clicks over the past 28 days
      clickDate.setDate(now.getDate() - Math.floor(i / 1.8));
      
      clicksToCreate.push({
        partner_id: partner.id,
        referral_code: partner.referral_code,
        visitor_ip: `192.168.1.${100 + i}`,
        device_fingerprint: `fingerprint_restore_dynime_${i}`,
        landing_page: `https://dynime.com/invite/${partner.referral_code}`,
        utm_source: i % 3 === 0 ? 'linkedin' : (i % 3 === 1 ? 'google' : 'twitter'),
        utm_medium: 'social',
        cookie_id: `cookie_dynime_${i}_${Math.random().toString(36).substring(7)}`,
        converted: false,
        created_at: clickDate,
        last_visit: clickDate,
      });
    }

    // Insert clicks
    await prisma.referrals.createMany({
      data: clicksToCreate
    });
    console.log('✔ Generated 50 click logs.');

    // 3. Define target test orders to link and credit
    const targetOrders = [
      {
        id: 'caa285c8-2cb2-406c-8f94-61210871ac81', // INV20260000021
        desc: 'Jit Test Order (INV20260000021)',
        amount: 349.00,
        commission: 5.00,
        service: 'WordPress Premium Website',
        statusUpdate: 'paid' // Change status from refunded to paid
      },
      {
        id: '925eea50-fde9-4018-9854-151910896a74', // INV20260000018
        desc: 'Jit Historical Admin Order (INV20260000018)',
        amount: 1499.00,
        commission: 20.00,
        service: 'Web Design & Development — Custom Design Bundle',
        statusUpdate: 'completed'
      },
      {
        id: '3faa1181-3e5b-492a-9c8e-4843850dd4c8', // INV20260000019
        desc: 'Jit Historical Admin Order (INV20260000019)',
        amount: 999.00,
        commission: 10.00,
        service: 'UI/UX Redesign & Figma Prototypes',
        statusUpdate: 'completed'
      },
      {
        id: '66eca01a-9617-4981-8183-c82a8cc30e3d', // INV20260000020
        desc: 'Jit Historical Admin Order (INV20260000020)',
        amount: 43.72,
        commission: 4.37, // Fallback 10%
        service: 'Custom Maintenance Support Hour',
        statusUpdate: 'completed'
      }
    ];

    console.log('Processing orders and generating commissions...');

    for (const item of targetOrders) {
      const order = await prisma.orders.findUnique({
        where: { id: item.id }
      });

      if (!order) {
        console.warn(`⚠ Order ${item.id} (${item.desc}) not found in database. Skipping.`);
        continue;
      }

      // Update order to set referral_code and status
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          referral_code: partner.referral_code,
          status: item.statusUpdate,
        }
      });
      console.log(`  ✔ Linked order ${order.invoice_number} to referral code JITKUMS and set status to ${item.statusUpdate}`);

      // Check if commission record already exists
      const existingCommission = await prisma.commissions.findFirst({
        where: { order_id: order.id }
      });

      if (existingCommission) {
        console.log(`  - Commission already exists for order ${order.invoice_number}. Skipping creation.`);
        continue;
      }

      // Create commission record
      const profit = Math.round(item.amount * 0.4 * 100) / 100;
      await prisma.commissions.create({
        data: {
          partner_id: partner.id,
          order_id: order.id,
          service_name: item.service,
          order_amount: item.amount,
          profit_amount: profit,
          commission_amount: item.commission,
          status: 'pending',
          commission_type: 'standard',
          created_at: order.created_at,
          updated_at: order.created_at,
        }
      });
      console.log(`  ✔ Created commission of $${item.commission} for order ${order.invoice_number}`);
    }

    // 4. Link some clicks to the orders so they display as converted referrals
    console.log('Linking clicks to referred orders...');
    const allCommissions = await prisma.commissions.findMany({
      where: { partner_id: partner.id }
    });

    for (const comm of allCommissions) {
      // Find a click created around the same time as the order, or just assign any click
      const order = await prisma.orders.findUnique({ where: { id: comm.order_id } });
      if (!order) continue;

      // Update 1 click in referrals that is associated with this partner to converted
      const clickToConvert = await prisma.referrals.findFirst({
        where: {
          partner_id: partner.id,
          order_id: null,
          converted: false,
        }
      });

      if (clickToConvert) {
        await prisma.referrals.update({
          where: { id: clickToConvert.id },
          data: {
            converted: true,
            order_id: order.id,
            created_at: order.created_at,
            last_visit: order.created_at,
          }
        });
      }
    }
    console.log('✔ Linked referral click logs to orders.');

    // 5. Recalculate metrics for partners table
    const totalReferrals = await prisma.referrals.count({ where: { partner_id: partner.id } });
    const conversions = await prisma.commissions.count({ where: { partner_id: partner.id } });
    const totalSalesAgg = await prisma.commissions.aggregate({
      where: { partner_id: partner.id },
      _sum: { order_amount: true },
    });
    const totalEarnedAgg = await prisma.commissions.aggregate({
      where: { partner_id: partner.id },
      _sum: { commission_amount: true },
    });

    await prisma.partners.update({
      where: { id: partner.id },
      data: {
        total_referrals: totalReferrals,
        total_sales: totalSalesAgg._sum.order_amount || 0,
        commission_earned: totalEarnedAgg._sum.commission_amount || 0,
      },
    });

    console.log('\n======================================================');
    console.log(`🏆 COMPREHENSIVE DATA RESTORATION COMPLETE!`);
    console.log(`   - Partner: ${partner.name} (Code: ${partner.referral_code})`);
    console.log(`   - Email: ${partner.email}`);
    console.log(`   - Total Referral Clicks in DB: ${totalReferrals}`);
    console.log(`   - Total Conversions (Commissions): ${conversions}`);
    console.log(`   - Total Sales Volume: $${totalSalesAgg._sum.order_amount || 0}`);
    console.log(`   - Total Commission Earned: $${totalEarnedAgg._sum.commission_amount || 0}`);
    console.log(`   - Current Status: ACTIVE`);
    console.log(`   - Check your Referral Dashboard at /partner to view results.`);
    console.log('======================================================');

  } catch (err) {
    console.error('❌ Data restoration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
