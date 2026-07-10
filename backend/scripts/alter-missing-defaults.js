const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    "ALTER TABLE attendance_records MODIFY break_minutes INT NOT NULL DEFAULT 0, MODIFY status VARCHAR(50) NOT NULL DEFAULT 'present'",
    "ALTER TABLE inbound_emails MODIFY folder VARCHAR(50) NOT NULL DEFAULT 'inbox', MODIFY is_archived TINYINT(1) NOT NULL DEFAULT 0, MODIFY metadata JSON NULL"
  ];

  for (const q of queries) {
    console.log(`Executing: ${q}...`);
    try {
      await prisma.$executeRawUnsafe(q);
      console.log(" -> SUCCESS");
    } catch (err) {
      console.log(` -> FAILED: ${err.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
