import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpOrders() {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.orders.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    console.log(`Dumping last ${orders.length} orders:`);
    for (const order of orders) {
      console.log(`\n=========================================`);
      console.log(`Order ID: ${order.id}`);
      console.log(`Invoice: ${order.invoice_number}`);
      console.log(`Status: ${order.status}`);
      console.log(`Total: ${order.total}`);
      console.log(`Items:`, JSON.stringify(order.items, null, 2));
      console.log(`Service Brief:`, JSON.stringify(order.service_brief, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

dumpOrders();
