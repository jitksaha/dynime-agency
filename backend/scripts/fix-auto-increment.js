const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
  );
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    console.log(`Fixing auto-increment for ${tableName}...`);
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`);
    } catch (err) {
      console.log(`Failed for ${tableName}: ${err.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
