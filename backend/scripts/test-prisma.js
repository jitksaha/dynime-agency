const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.portfolio_projects.findFirst();
  console.log("First portfolio project:", project);
}

main().catch(console.error).finally(() => prisma.$disconnect());
