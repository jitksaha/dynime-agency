import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SUPABASE_INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('Seeding users...');
  
  const now = new Date();
  
  // 1. Seed Super Admin User
  const adminId = 'c63fe86b-0c49-4013-91f1-d0329e9be148';
  const adminEmail = 'admin@dynime.com';
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  
  // Clean up any partial state
  await prisma.user_roles.deleteMany({ where: { user_id: adminId } }).catch(() => {});
  await prisma.profiles.deleteMany({ where: { id: adminId } }).catch(() => {});
  await prisma.users.deleteMany({ where: { id: adminId } }).catch(() => {});
  
  // Create user
  await prisma.users.create({
    data: {
      id: adminId,
      instance_id: SUPABASE_INSTANCE_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: adminEmail,
      encrypted_password: adminPasswordHash,
      email_confirmed_at: now,
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: {
        full_name: 'Super Admin',
        email_verified: true,
      },
      created_at: now,
      updated_at: now,
    }
  });
  
  // Check if profile was created automatically by trigger
  const existingProfile = await prisma.profiles.findUnique({ where: { id: adminId } });
  if (existingProfile) {
    await prisma.profiles.update({
      where: { id: adminId },
      data: {
        email: adminEmail,
        full_name: 'Super Admin',
        updated_at: now,
      }
    });
  } else {
    await prisma.profiles.create({
      data: {
        id: adminId,
        email: adminEmail,
        full_name: 'Super Admin',
        created_at: now,
        updated_at: now,
      }
    });
  }
  
  // Assign role
  await prisma.user_roles.create({
    data: {
      user_id: adminId,
      role: 'super_admin',
      created_at: now,
    }
  });
  
  console.log(`✔ Created Super Admin user: ${adminEmail} / Admin123!`);
  
  // 2. Seed Customer User
  const customerId = 'a1127a80-0e5a-4141-b7ea-954cca15eb2e';
  const customerEmail = 'customer@dynime.com';
  const customerPasswordHash = await bcrypt.hash('Customer123!', 10);
  
  // Clean up any partial state
  await prisma.user_roles.deleteMany({ where: { user_id: customerId } }).catch(() => {});
  await prisma.profiles.deleteMany({ where: { id: customerId } }).catch(() => {});
  await prisma.users.deleteMany({ where: { id: customerId } }).catch(() => {});
  
  // Create user
  await prisma.users.create({
    data: {
      id: customerId,
      instance_id: SUPABASE_INSTANCE_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: customerEmail,
      encrypted_password: customerPasswordHash,
      email_confirmed_at: now,
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: {
        full_name: 'Regular Customer',
        email_verified: true,
      },
      created_at: now,
      updated_at: now,
    }
  });
  
  // Check if profile was created automatically by trigger
  const existingCustomerProfile = await prisma.profiles.findUnique({ where: { id: customerId } });
  if (existingCustomerProfile) {
    await prisma.profiles.update({
      where: { id: customerId },
      data: {
        email: customerEmail,
        full_name: 'Regular Customer',
        updated_at: now,
      }
    });
  } else {
    await prisma.profiles.create({
      data: {
        id: customerId,
        email: customerEmail,
        full_name: 'Regular Customer',
        created_at: now,
        updated_at: now,
      }
    });
  }
  
  // Assign role
  await prisma.user_roles.create({
    data: {
      user_id: customerId,
      role: 'investor',
      created_at: now,
    }
  });
  
  console.log(`✔ Created Customer user: ${customerEmail} / Customer123!`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
