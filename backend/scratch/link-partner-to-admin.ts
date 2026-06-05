import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== Linking Partner Profile to Admin Account ===');

    // 1. Find the admin user profile
    const adminUser = await prisma.profiles.findFirst({
      where: { email: 'mail.dynime@gmail.com' }
    });

    if (!adminUser) {
      console.error('❌ Admin user mail.dynime@gmail.com not found.');
      return;
    }

    console.log(`Found Admin User: ${adminUser.full_name} (ID: ${adminUser.id})`);

    // 2. Find the partner profile currently linked to mail.jitsaha@gmail.com
    const partner = await prisma.partners.findFirst({
      where: { referral_code: 'JITKUMS' }
    });

    if (!partner) {
      console.error('❌ Partner JITKUMS not found in the database.');
      return;
    }

    console.log(`Found Partner Profile: ${partner.name} (Current User ID: ${partner.user_id}, Current Email: ${partner.email})`);

    // 3. Update the partner profile to use the admin user ID and email
    const updatedPartner = await prisma.partners.update({
      where: { id: partner.id },
      data: {
        user_id: adminUser.id,
        email: adminUser.email,
        name: adminUser.full_name || partner.name
      }
    });

    console.log(`✔ Updated Partner Profile. New User ID: ${updatedPartner.user_id}, New Email: ${updatedPartner.email}`);

    // 4. Upsert partner role in user_roles for the admin user
    const roleUpsert = await prisma.user_roles.upsert({
      where: {
        user_id_role: {
          user_id: adminUser.id,
          role: 'partner'
        }
      },
      update: {},
      create: {
        user_id: adminUser.id,
        role: 'partner'
      }
    });

    console.log(`✔ Assigned 'partner' role to user ID: ${adminUser.id} (Role ID: ${roleUpsert.id})`);

    // 5. Clean up old user role from the secondary account if desired, or keep it
    const oldRole = await prisma.user_roles.findFirst({
      where: {
        user_id: '83d1c0f6-e1a8-4c6a-8f73-ac41dc676404',
        role: 'partner'
      }
    });
    if (oldRole) {
      await prisma.user_roles.delete({
        where: { id: oldRole.id }
      });
      console.log(`✔ Removed 'partner' role from old user ID: 83d1c0f6-e1a8-4c6a-8f73-ac41dc676404`);
    }

    console.log('🎉 LINKING COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Linking failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
