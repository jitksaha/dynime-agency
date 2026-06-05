import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const partner = await prisma.partners.findFirst({
      where: { email: 'john.doe@example.com' }
    });

    if (!partner) {
      console.error('John Doe partner not found!');
      return;
    }

    // Let's find some order IDs to associate the commissions with
    const orders = await prisma.orders.findMany({
      take: 2
    });

    if (orders.length < 2) {
      console.error('Not enough orders in DB to associate commissions!');
      return;
    }

    console.log('Inserting approved commissions for partner:', partner.id);

    // Delete any existing commissions for John Doe to make it clean
    await prisma.commissions.deleteMany({
      where: { partner_id: partner.id }
    });

    // Commission 1
    await prisma.commissions.create({
      data: {
        partner_id: partner.id,
        order_id: orders[0].id,
        service_name: 'Logo Design & Branding',
        order_amount: 500.00,
        cost_amount: 200.00,
        profit_amount: 300.00,
        commission_amount: 50.00,
        status: 'approved',
        commission_type: 'standard',
        approved_at: new Date()
      }
    });

    // Commission 2
    await prisma.commissions.create({
      data: {
        partner_id: partner.id,
        order_id: orders[1].id,
        service_name: 'Custom Web Application',
        order_amount: 1200.00,
        cost_amount: 400.00,
        profit_amount: 800.00,
        commission_amount: 45.00,
        status: 'approved',
        commission_type: 'standard',
        approved_at: new Date()
      }
    });

    console.log('Successfully set up $95.00 in approved commissions for John Doe.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
