const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE office_locations MODIFY id BIGINT UNSIGNED NOT NULL;");
    await prisma.$executeRawUnsafe("ALTER TABLE office_locations DROP PRIMARY KEY;");
    await prisma.$executeRawUnsafe("ALTER TABLE office_locations MODIFY id VARCHAR(36) NOT NULL;");
    await prisma.$executeRawUnsafe("ALTER TABLE office_locations ADD PRIMARY KEY (id);");
    console.log("Successfully altered office_locations.id to VARCHAR(36)");
  } catch (err) {
    console.error("Failed to alter: ", err);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
}

main().catch(console.error).finally(() => prisma.$disconnect());
