import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const svc = app.get(AuthService);

  try {
    console.log('--- Testing login with mail.dynime@gmail.com ---');
    const res = await svc.login({
      email: 'mail.dynime@gmail.com',
      password: 'Pixel#@!194JkS'
    }, { ip: '127.0.0.1', userAgent: 'test', deviceId: null, deviceLabel: null });
    console.log('Login Result:', res);
  } catch (error) {
    console.error('Caught Error:', error);
  } finally {
    await app.close();
  }
}

main();
