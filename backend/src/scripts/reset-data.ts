import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- بدء عملية تصفية البيانات ---');

  try {
    // حذف بيانات المبيعات أولاً بسبب القيود (Foreign Keys)
    const deletedSaleItems = await prisma.saleItem.deleteMany();
    console.log(`تم حذف ${deletedSaleItems.count} من بنود المبيعات.`);

    const deletedSales = await prisma.sale.deleteMany();
    console.log(`تم حذف ${deletedSales.count} من عمليات البيع.`);

    // حذف المنتجات
    const deletedProducts = await prisma.product.deleteMany();
    console.log(`تم حذف ${deletedProducts.count} من المنتجات.`);

    // حذف الديون
    const deletedDebts = await prisma.debt.deleteMany();
    console.log(`تم حذف ${deletedDebts.count} من سجلات الديون.`);

    console.log('--- تمت تصفية البيانات بنجاح (تم الإبقاء على المستخدمين) ---');
  } catch (error) {
    console.error('حدث خطأ أثناء تصفية البيانات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
