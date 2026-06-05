import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findRecentOrders() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Searching for orders created today (June 4, 2026) ---');
    
    const today = new Date('2026-06-04T00:00:00Z');
    
    const orders = await prisma.orders.findMany({
      where: {
        created_at: {
          gte: today,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    console.log(`Found ${orders.length} orders created today:`);
    for (const o of orders) {
      console.log(`- ID: ${o.id}, Name: ${o.customer_name}, Email: ${o.customer_email}, Status: ${o.status}, Total: ${o.total}, RefCode: ${o.referral_code}, CreatedAt: ${o.created_at.toISOString()}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findRecentOrders();
