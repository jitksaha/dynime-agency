import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Checking Profile ---');
    const profile = await prisma.profiles.findFirst({
      where: { email: { equals: 'mail.jitsaha@gmail.com', mode: 'insensitive' } }
    });
    console.log('Profile found:', JSON.stringify(profile, null, 2));

    if (!profile) {
      console.log('No profile exists for mail.jitsaha@gmail.com');
      return;
    }

    console.log('\n--- Simulating KYC Verification Insert ---');
    const tempSessionId = `mock-session-test-${Date.now()}`;
    const verificationUrl = 'http://localhost:5001/account/verification?kyc_done=1';

    const existing = await prisma.kyc_verifications.findUnique({
      where: { user_id: profile.id },
      select: { id: true },
    });
    console.log('Existing verification:', existing);

    if (existing) {
      const updated = await prisma.kyc_verifications.update({
        where: { id: existing.id },
        data: {
          didit_session_id: tempSessionId,
          workflow_id: 'mock-workflow',
          verification_url: verificationUrl,
          status: 'pending',
          updated_at: new Date(),
        },
      });
      console.log('Updated verification:', updated);
    } else {
      const created = await prisma.kyc_verifications.create({
        data: {
          user_id: profile.id,
          didit_session_id: tempSessionId,
          workflow_id: 'mock-workflow',
          verification_url: verificationUrl,
          status: 'pending',
        },
      });
      console.log('Created verification:', created);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
