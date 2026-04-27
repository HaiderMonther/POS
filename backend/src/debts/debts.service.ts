import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto, DebtType } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

@Injectable()
export class DebtsService {
  constructor(private prisma: PrismaService) {}

  async create(createDebtDto: CreateDebtDto) {
    const { dueDate, ...rest } = createDebtDto;
    return this.prisma.debt.create({
      data: {
        ...rest,
        type: createDebtDto.type as any,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
  }

  async findAll(type?: DebtType) {
    return this.prisma.debt.findMany({
      where: type ? { type: type as any } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const debt = await this.prisma.debt.findUnique({ where: { id } });
    if (!debt) throw new NotFoundException('Debt record not found');
    return debt;
  }

  async update(id: number, updateDebtDto: UpdateDebtDto) {
    const { dueDate, ...rest } = updateDebtDto;
    return this.prisma.debt.update({
      where: { id },
      data: {
        ...rest,
        type: updateDebtDto.type ? (updateDebtDto.type as any) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
  }

  async recordPayment(id: number, amount: number) {
    const debt = await this.findOne(id);
    return this.prisma.debt.update({
      where: { id },
      data: {
        paidAmount: {
          increment: amount,
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.debt.delete({ where: { id } });
  }

  async getFinancialSummary() {
    const result = await this.prisma.debt.groupBy({
      by: ['type'],
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const summary = {
      receivables: 0, // CUSTOMER
      payables: 0,    // SUPPLIER
    };

    result.forEach((item) => {
      const balance = (item._sum.amount || 0) - (item._sum.paidAmount || 0);
      if (item.type === 'CUSTOMER') summary.receivables = balance;
      if (item.type === 'SUPPLIER') summary.payables = balance;
    });

    return summary;
  }
}
