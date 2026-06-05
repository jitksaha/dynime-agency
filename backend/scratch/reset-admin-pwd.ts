import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = 'mail.dynime@gmail.com';
    const pwdHash = await bcrypt.hash('Pixel#@!194JkS', 10);
    const updated = await prisma.users.updateMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      data: { encrypted_password: pwdHash }
    });
    console.log(`Updated ${updated.count} users password to Pixel#@!194JkS`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
