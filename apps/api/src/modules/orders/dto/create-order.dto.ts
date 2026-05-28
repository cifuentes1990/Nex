import { Type } from 'class-transformer';
import {
  IsArray, IsNumber, IsOptional, IsString,
  Min, ValidateNested, IsEnum, IsObject, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
}

class ShippingAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}

export class CreateOrderDto {
  // ── Core ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // ── Pricing ───────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) subtotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) shippingCost?: number;

  // ── Payment ───────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentReference?: string;

  // ── Channel & delivery ────────────────────────────────────────────────
  @ApiPropertyOptional({
    enum: ['POS', 'ONLINE', 'WHATSAPP', 'PHONE', 'MARKETPLACE', 'INSTAGRAM'],
    default: 'POS',
  })
  @IsOptional()
  @IsEnum(['POS', 'ONLINE', 'WHATSAPP', 'PHONE', 'MARKETPLACE', 'INSTAGRAM'])
  channel?: string;

  @ApiPropertyOptional({
    enum: ['PICKUP', 'HOME_DELIVERY', 'COURIER', 'DIGITAL'],
    default: 'PICKUP',
  })
  @IsOptional()
  @IsEnum(['PICKUP', 'HOME_DELIVERY', 'COURIER', 'DIGITAL'])
  deliveryMethod?: string;

  // ── Shipping ──────────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: ShippingAddressDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional() @IsOptional() @IsString() trackingNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courierName?: string;

  // ── Scheduling ────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() estimatedDelivery?: string;

  // ── Notes ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNote?: string;

  // ── Source tracking ───────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
}
