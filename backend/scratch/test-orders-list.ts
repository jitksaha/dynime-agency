import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OrdersService } from '../src/orders/orders.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(OrdersService);

  try {
    console.log('--- Testing listAdmin with email ---');
    const res1 = await svc.listAdmin({ email: 'mail.jitsaha@gmail.com' });
    console.log('Result with email mail.jitsaha@gmail.com:', res1);

    console.log('--- Testing listAdmin without filter ---');
    const res2 = await svc.listAdmin({});
    console.log('Result without filter (first 5):', {
      total: res2.total,
      sampleEmails: res2.data.slice(0, 5).map(o => ({ invoice: o.invoice_number, email: o.customer_email, user_id: o.user_id }))
    });
  } catch (error) {
    console.error('Caught Error:', error);
  } finally {
    await app.close();
  }
}

main();
