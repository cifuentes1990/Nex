import {
  IsString, IsNumber, IsOptional, IsBoolean,
  IsArray, Min, IsEnum, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
const ProductStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', DISCONTINUED: 'DISCONTINUED', OUT_OF_STOCK: 'OUT_OF_STOCK', COMING_SOON: 'COMING_SOON' } as const;
type ProductStatus = typeof ProductStatus[keyof typeof ProductStatus];

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  @IsString() @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'APPL-IP15PM-256' })
  @IsString() @MaxLength(100)
  sku: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  barcode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  shortDescription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  supplierId?: string;

  @ApiProperty({ example: 4500000 })
  @IsNumber() @Min(0)
  basePrice: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: 3200000 })
  @IsOptional() @IsNumber() @Min(0)
  costPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  taxIncluded?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  allowBackorder?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  minStockAlert?: number;

  @ApiPropertyOptional({ description: 'Initial stock quantity when creating the product' })
  @IsOptional() @IsNumber() @Min(0)
  stock?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  image?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray()
  images?: string[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray()
  tags?: string[];

  @ApiPropertyOptional() @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional() @IsOptional()
  attributes?: Record<string, any>;
}
