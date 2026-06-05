import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = 'mail.jitsaha@gmail.com';
    const where: any = {};
    where.customer_email = { contains: email, mode: 'insensitive' };

    const data = await prisma.orders.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    console.log('Query Result count:', data.length);
    for (const o of data) {
      console.log(`Order: ${o.invoice_number}, Email: ${o.customer_email}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
