import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchOrders() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Searching orders for JIT or referral codes ---');

    // 1. Search by customer_email or customer_name
    const ordersByCustomer = await prisma.orders.findMany({
      where: {
        OR: [
          { customer_email: { contains: 'jit', mode: 'insensitive' } },
          { customer_name: { contains: 'jit', mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    console.log(`Found ${ordersByCustomer.length} orders matching customer name/email containing "jit":`);
    for (const o of ordersByCustomer) {
      console.log(`- ID: ${o.id}, Name: ${o.customer_name}, Email: ${o.customer_email}, Status: ${o.status}, Total: ${o.total}, RefCode: ${o.referral_code}`);
    }

    // 2. Search for any orders where coupon_code contains 'jit' or referral_code is not null
    const ordersWithCoupon = await prisma.orders.findMany({
      where: {
        OR: [
          { coupon_code: { contains: 'jit', mode: 'insensitive' } },
          { referral_code: { not: null } }
        ]
      },
      take: 10,
    });
    console.log(`\nFound ${ordersWithCoupon.length} orders with coupon containing "jit" or non-null refcode:`);
    for (const o of ordersWithCoupon) {
      console.log(`- ID: ${o.id}, Status: ${o.status}, Total: ${o.total}, Coupon: ${o.coupon_code}, RefCode: ${o.referral_code}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

searchOrders();
