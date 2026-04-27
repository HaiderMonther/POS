import { IsString, IsNotEmpty, IsNumber, IsPositive, Min, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsNumber()
  @IsPositive()
  purchasePrice: number;

  @IsNumber()
  @IsPositive()
  sellingPrice: number;

  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsNumber()
  @Min(0)
  alertQuantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsOptional()
  isMultiUnit?: boolean;

  @IsString()
  @IsOptional()
  subUnitName?: string;

  @IsNumber()
  @IsOptional()
  subUnitFactor?: number;

  @IsString()
  @IsOptional()
  masterUnitName?: string;

  @IsNumber()
  @IsOptional()
  masterUnitFactor?: number;
  @IsNumber()
  @IsOptional()
  wholesalePrice?: number;

  @IsString()
  @IsOptional()
  wholesaleUnit?: string;
}
