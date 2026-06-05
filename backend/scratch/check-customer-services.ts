import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const count = await prisma.customer_services.count();
    console.log('Total customer_services:', count);
    const sample = await prisma.customer_services.findMany({ take: 5 });
    console.log('Sample customer_services:', JSON.stringify(sample, null, 2));

    const ordersCount = await prisma.orders.count();
    console.log('Total orders:', ordersCount);
    const paidOrders = await prisma.orders.findMany({
      where: { status: { in: ['paid', 'completed'] } },
      take: 5
    });
    console.log('Paid/completed orders:', JSON.stringify(paidOrders, null, 2));
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
