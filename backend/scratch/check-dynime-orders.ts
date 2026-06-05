import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Checking orders for mail.dynime@gmail.com ===');
    const ordersByEmail = await prisma.orders.findMany({
      where: {
        customer_email: { equals: 'mail.dynime@gmail.com', mode: 'insensitive' }
      }
    });

    console.log(`Found ${ordersByEmail.length} orders by email.`);
    for (const o of ordersByEmail) {
      console.log(`Order ID: ${o.id}, Invoice: ${o.invoice_number}, Status: ${o.status}, Total: ${o.total}, RefCode: ${o.referral_code}`);
    }

    const ordersByUserId = await prisma.orders.findMany({
      where: {
        user_id: '482fd4cf-bfaf-47d8-ba0d-aab9e34f9261'
      }
    });

    console.log(`Found ${ordersByUserId.length} orders by user_id.`);
    for (const o of ordersByUserId) {
      console.log(`Order ID: ${o.id}, Invoice: ${o.invoice_number}, Status: ${o.status}, Total: ${o.total}, RefCode: ${o.referral_code}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
