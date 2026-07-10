const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    "ALTER TABLE app_refresh_tokens MODIFY token_hash VARCHAR(255) NOT NULL, ADD UNIQUE KEY app_refresh_tokens_token_hash_unique (token_hash)",
    "ALTER TABLE blog_posts MODIFY slug VARCHAR(255) NOT NULL, ADD UNIQUE KEY blog_posts_slug_unique (slug)",
    "ALTER TABLE careers MODIFY slug VARCHAR(255) NOT NULL, ADD UNIQUE KEY careers_slug_unique (slug)",
    "ALTER TABLE service_pricing MODIFY service_slug VARCHAR(255) NOT NULL, ADD UNIQUE KEY service_pricing_service_slug_unique (service_slug)"
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
