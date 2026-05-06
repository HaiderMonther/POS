import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();
  const saleCount = await prisma.sale.count();
  const userCount = await prisma.user.count();
  
  console.log(`Products: ${productCount}`);
  console.log(`Sales: ${saleCount}`);
  console.log(`Users: ${userCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
