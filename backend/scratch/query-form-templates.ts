import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Checking Form Templates ---');
    const templates = await prisma.form_templates.findMany();
    console.log('Total templates found:', templates.length);
    for (const t of templates) {
      console.log(`ID: ${t.id}, Name: "${t.name}", Slug: "${t.slug}", IsActive: ${t.is_active}`);
    }
  } catch (error) {
    console.error('Error querying form templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
