const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  console.log('All users in Prisma:', users);
}
run().finally(() => prisma.$disconnect());
