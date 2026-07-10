const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE gsc_cache MODIFY cache_key VARCHAR(255) NOT NULL;");
    await prisma.$executeRawUnsafe("ALTER TABLE gsc_cache ADD PRIMARY KEY (cache_key);");
    console.log("Successfully altered gsc_cache table!");
  } catch (err) {
    console.error("Altering failed: ", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
