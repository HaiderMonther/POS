import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { barcode: createProductDto.barcode },
    });
    if (existing) {
      throw new ConflictException('Product with this barcode already exists');
    }
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({ where: { barcode } });
    if (!product) throw new NotFoundException('Product with this barcode not found');
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  async getLowStock() {
    return this.prisma.$queryRaw`
      SELECT * FROM "Product" 
      WHERE "stockQuantity" <= "alertQuantity"
    `;
  }
}
