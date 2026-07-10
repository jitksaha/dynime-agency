const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE payouts ADD COLUMN transaction_id VARCHAR(255) NULL;");
    console.log("Successfully added transaction_id to payouts!");
  } catch (err) {
    console.error("Altering failed: ", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
