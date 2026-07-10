import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('On prototype:', 'admin_users' in PrismaClient.prototype);
console.log('On instance:', 'admin_users' in prisma);
prisma.$disconnect();
