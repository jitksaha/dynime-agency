import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VerificationService } from '../src/verification/verification.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(VerificationService);

  try {
    console.log('--- Simulating Admin Request ---');
    const caller = {
      id: '482fd4cf-bfaf-47d8-ba0d-aab9e34f9261', // super admin id
      email: 'mail.dynime@gmail.com',
      roles: ['super_admin'],
    };

    const res = await svc.adminRequest({
      user_id: '83d1c0f6-e1a8-4c6a-8f73-ac41dc676404', // JIT KUMAR SAHA profile id
      type: 'kyc',
      order_id: 'bf23d4b8-1aa5-4ce8-9a82-f515492f7a04',
      frontend_origin: 'http://localhost:5001',
    }, caller as any);

    console.log('Result:', res);
  } catch (error) {
    console.error('Caught Error:', error);
  } finally {
    await app.close();
  }
}

main();
