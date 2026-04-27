import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get('reports')
  getReports(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDate = end ? new Date(end) : new Date(new Date().setHours(23, 59, 59, 999));
    return this.salesService.getReports(startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }
}
