import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, PaymentType } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    const { items, discount = 0, paymentType, customerName, customerPhone } = createSaleDto;

    // 1. Fetch all products to check stock and prices
    const productIds = items.map((i) => i.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // 2. Map items with product data and check stock
    const saleItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product with ID ${item.productId} not found`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`الكمية غير كافية للمنتج: ${product.name}`);
      }
      
      // Determine selling price: Use provided price if available, else fallback to product price
      let sellingPrice = item.price;
      if (sellingPrice === undefined || sellingPrice === null) {
        sellingPrice = item.saleType === 'جملة' ? (product.wholesalePrice || product.sellingPrice) : product.sellingPrice;
      }

      return {
        ...item,
        purchasePriceAtSale: product.purchasePrice || 0,
        sellingPriceAtSale: sellingPrice || 0,
        saleUnit: item.saleUnit || (item.saleType === 'جملة' ? (product.wholesaleUnit || product.unit) : product.unit),
      };
    });

    // 3. Calculate total
    const subtotal = saleItemsData.reduce(
      (sum, item) => sum + item.sellingPriceAtSale * item.quantity,
      0,
    );
    const totalAmount = subtotal - discount;

    // 4. Transactional execution
    return this.prisma.$transaction(async (tx) => {
      // a. Create Sale
      const sale = await tx.sale.create({
        data: {
          totalAmount,
          discount,
          paymentType: paymentType as any,
          items: {
            create: saleItemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              purchasePriceAtSale: item.purchasePriceAtSale,
              sellingPriceAtSale: item.sellingPriceAtSale,
              saleUnit: item.saleUnit,
            })),
          },
        },
        include: { items: true },
      });

      // b. Update Stocks
      for (const item of saleItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // c. Handle Debt if deferred
      if (paymentType === PaymentType.DEFERRED) {
        if (!customerName) {
          throw new BadRequestException('Customer name is required for deferred payments');
        }
        
        // Check if customer already has a debt record
        const existingDebt = await tx.debt.findFirst({
          where: { 
            type: 'CUSTOMER',
            personName: customerName 
          }
        });

        if (existingDebt) {
          // Increment existing debt amount
          await tx.debt.update({
            where: { id: existingDebt.id },
            data: {
              amount: { increment: totalAmount },
              // Option to update phone if it was empty
              phone: existingDebt.phone ? undefined : customerPhone
            }
          });
        } else {
          // Create new record
          await tx.debt.create({
            data: {
              type: 'CUSTOMER',
              personName: customerName,
              phone: customerPhone,
              amount: totalAmount,
              paidAmount: 0,
            },
          });
        }
      }

      return sale;
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }

  async getReports(startDate: Date, endDate: Date) {
    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { items: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = sales.reduce((sum, s) => {
      const saleProfit = s.items.reduce((pSum, item) => {
        return pSum + (item.sellingPriceAtSale - item.purchasePriceAtSale) * item.quantity;
      }, 0);
      return sum + saleProfit - (s.discount || 0);
    }, 0);

    return {
      totalSales,
      totalProfit,
      count: sales.length,
    };
  }
}
