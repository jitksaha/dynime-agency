const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE payouts DROP COLUMN payment_method;");
  } catch {}
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE payouts DROP COLUMN payment_details;");
  } catch {}
  await prisma.$executeRawUnsafe("ALTER TABLE payouts ADD COLUMN payout_method VARCHAR(100) NOT NULL;");
  await prisma.$executeRawUnsafe("ALTER TABLE payouts ADD COLUMN details JSON NULL;");
  console.log("Successfully altered payouts columns!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
