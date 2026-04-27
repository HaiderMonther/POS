import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentType {
  CASH = 'CASH',
  DEFERRED = 'DEFERRED',
}

export class SaleItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  saleUnit?: string;

  @IsString()
  @IsOptional()
  saleType?: string;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;
}
