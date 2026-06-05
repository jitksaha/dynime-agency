import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Checking for potentially uncredited referred orders ===');
    
    // Fetch all orders from the last 7 days
    const recentOrders = await prisma.orders.findMany({
      where: {
        created_at: {
          gte: new Date('2026-05-28T00:00:00Z')
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`Found ${recentOrders.length} recent orders.`);

    for (const order of recentOrders) {
      // Check if this order already has a commission record
      const commission = await prisma.commissions.findFirst({
        where: { order_id: order.id }
      });

      console.log(`Order ID: ${order.id}`);
      console.log(`  Invoice: ${order.invoice_number}`);
      console.log(`  Customer: ${order.customer_name} <${order.customer_email}>`);
      console.log(`  Total: $${order.total}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Referral Code in DB: ${order.referral_code}`);
      console.log(`  Has Commission Record: ${commission ? 'YES ($' + commission.commission_amount + ')' : 'NO'}`);

      // If it doesn't have a commission record, let's look for matching referral clicks by IP/cookies
      if (!commission) {
        // Find referral clicks around the order creation time (within 24 hours prior)
        const possibleReferrals = await prisma.referrals.findMany({
          where: {
            created_at: {
              lte: order.created_at,
              gte: new Date(order.created_at.getTime() - 1000 * 60 * 60 * 24 * 7) // 7 days prior
            }
          },
          orderBy: { created_at: 'desc' }
        });

        if (possibleReferrals.length > 0) {
          console.log(`  -> Found ${possibleReferrals.length} possible referral clicks in the 7 days prior to this order:`);
          for (const ref of possibleReferrals.slice(0, 3)) {
            console.log(`     * Code: ${ref.referral_code}, IP: ${ref.visitor_ip}, Landing: ${ref.landing_page}, Created: ${ref.created_at.toISOString()}`);
          }
        } else {
          console.log(`  -> No prior referral clicks found in 7 days.`);
        }
      }
      console.log('----------------------------------------------------');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
