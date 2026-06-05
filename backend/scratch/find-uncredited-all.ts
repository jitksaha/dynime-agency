import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Searching all orders in DB for uncredited referrals ===');
    
    // Find all paid/completed/verified orders
    const paidOrders = await prisma.orders.findMany({
      where: {
        status: { in: ['paid', 'completed', 'verified'] },
        referral_code: { not: null, notIn: [''] }
      }
    });

    console.log(`Found ${paidOrders.length} paid/completed/verified orders with referral_code.`);

    for (const order of paidOrders) {
      const commission = await prisma.commissions.findFirst({
        where: { order_id: order.id }
      });
      if (!commission) {
        console.log(`UNCREDITED: Order ${order.id} (${order.invoice_number})`);
        console.log(`  Customer: ${order.customer_name} <${order.customer_email}>`);
        console.log(`  Total: $${order.total}`);
        console.log(`  Referral Code: ${order.referral_code}`);
        console.log(`  Created At: ${order.created_at.toISOString()}`);
      } else {
        console.log(`Credited: Order ${order.id} (${order.invoice_number}) -> Commission: $${commission.commission_amount}`);
      }
    }

    console.log('=== Done checking orders with code ===');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
