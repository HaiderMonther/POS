import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum DebtType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export class CreateDebtDto {
  @IsEnum(DebtType)
  type: DebtType;

  @IsString()
  @IsNotEmpty()
  personName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @IsString()
  @IsOptional()
  dueDate?: string;
}
