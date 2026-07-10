const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE site_settings MODIFY `key` VARCHAR(255) NOT NULL"
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE site_settings ADD UNIQUE KEY site_settings_key_unique (`key`)"
    );
    console.log("Successfully altered site_settings key column.");
  } catch (err) {
    console.error("Failed to alter: ", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
