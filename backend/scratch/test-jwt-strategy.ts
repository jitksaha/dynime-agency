import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    const sub = '482fd4cf-bfaf-47d8-ba0d-aab9e34f9261';
    console.log('Testing raw query unsafe with $1::uuid:');
    const users = await prisma.$queryRawUnsafe<{ id: string }[]>(
      'SELECT id FROM auth.users WHERE id = $1::uuid LIMIT 1',
      sub,
    );
    console.log('Query result:', users);

    console.log('Testing raw query user_roles with $1::uuid:');
    const roles = await prisma.$queryRawUnsafe<{ role: string }[]>(
      'SELECT role FROM public.user_roles WHERE user_id = $1::uuid',
      sub,
    );
    console.log('Roles result:', roles);
  } catch (error) {
    console.error('Caught Error during database query:', error);
  } finally {
    await app.close();
  }
}

main();
