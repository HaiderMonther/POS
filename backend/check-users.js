const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { username: 'haider_m' }
  });
  console.log('User in Prisma:', user);
  const count = await prisma.user.count();
  console.log('Total users in Prisma:', count);
}
checkUser().finally(() => prisma.$disconnect());
