import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { CreateDebtDto, DebtType } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';

@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  create(@Body() createDebtDto: CreateDebtDto) {
    return this.debtsService.create(createDebtDto);
  }

  @Get()
  findAll(@Query('type') type?: DebtType) {
    return this.debtsService.findAll(type);
  }

  @Get('summary')
  getFinancialSummary() {
    return this.debtsService.getFinancialSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.debtsService.findOne(+id);
  }

  @Patch(':id/payment')
  recordPayment(@Param('id') id: string, @Body('amount') amount: number) {
    return this.debtsService.recordPayment(+id, amount);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDebtDto: UpdateDebtDto) {
    return this.debtsService.update(+id, updateDebtDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.debtsService.remove(+id);
  }
}
