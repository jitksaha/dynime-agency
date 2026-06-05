import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.profiles.findFirst({
      where: { email: 'mail.jitsaha@gmail.com' }
    });
    console.log('User Profile:', user);

    if (user) {
      const orders = await prisma.orders.findMany({
        where: { user_id: user.id }
      });
      console.log(`Orders for user_id ${user.id}:`, orders.length);
      for (const o of orders) {
        console.log(`Order ID: ${o.id}, Invoice: ${o.invoice_number}, Email: ${o.customer_email}, Total: ${o.total}`);
      }

      const ordersByEmail = await prisma.orders.findMany({
        where: { customer_email: 'mail.jitsaha@gmail.com' }
      });
      console.log(`Orders for customer_email 'mail.jitsaha@gmail.com':`, ordersByEmail.length);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
