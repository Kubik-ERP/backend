// Class Validator
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// Enum
import { order_type } from '@prisma/client';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// DTO Product
export class ProductDto {
  @ApiProperty({
    description: 'Product ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsNotEmpty()
  public productId: string;

  @ApiProperty({
    description: 'Variant ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  public variantId: string;

  @ApiProperty({ description: 'Quantity', required: true, example: 1 })
  @IsNotEmpty()
  @IsNumber()
  public quantity: number;

  @ApiProperty({
    description: 'Notes of Product',
    required: false,
    example: 'Please make it crispy',
  })
  @IsString()
  public notes: string;
}

export class ProductListDto {
  @ApiProperty({ type: [ProductDto], description: 'List of Products' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  public products: ProductDto[];
}

export class ProceedInstantPaymentDto extends ProductListDto {
  @ApiProperty({
    description: 'Provider of Payment Gateway',
    required: true,
    example: 'midtrans',
  })
  @IsNotEmpty()
  public provider: string;

  @ApiProperty({ description: 'Order Type', enum: order_type, required: true })
  @IsNotEmpty()
  @IsEnum(order_type)
  public orderType: order_type;

  @ApiProperty({
    description: 'Payment Method ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsUUID()
  public paymentMethodId: string;

  @ApiProperty({
    description: 'Voucher ID that applied to the order (optional)',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  @IsOptional()
  public voucherId?: string;

  @ApiProperty({
    description: 'Customer ID',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsOptional()
  @IsString()
  public customerId?: string;

  @ApiProperty({
    description: 'Table Code',
    required: false,
    example: 'TBL01',
  })
  @IsString()
  public tableCode: string;

  @ApiProperty({
    description: 'Payment Amount',
    required: false,
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  public paymentAmount: number;

  @ApiProperty({
    description: 'Rounding Amount',
    required: false,
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  public rounding_amount?: number;
}

export class ProceedCheckoutInvoiceDto extends ProductListDto {
  @ApiProperty({ description: 'Order Type', enum: order_type, required: true })
  @IsNotEmpty()
  @IsEnum(order_type)
  public orderType: order_type;

  @ApiProperty({
    description: 'Voucher ID that applied to the order (optional)',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  @IsOptional()
  public voucherId?: string;

  @ApiProperty({
    description: 'Customer ID',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsUUID()
  public customerId: string;

  @ApiProperty({
    description: 'Table Code',
    required: false,
    example: 'TBL01',
  })
  @IsString()
  public tableCode: string;

  @ApiProperty({
    description: 'Rounding amount to be applied to the invoice',
    required: false,
    example: 84,
  })
  @IsOptional()
  @IsNumber()
  public rounding_amount?: number;
}

export class ProceedPaymentDto {
  @ApiProperty({
    description: 'Provider of Payment Gateway',
    required: true,
    example: 'midtrans',
  })
  @IsNotEmpty()
  public provider: string;

  @ApiProperty({
    description: 'Invoice ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsUUID()
  public invoiceId: string;

  @ApiProperty({
    description: 'Payment Method ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsUUID()
  public paymentMethodId: string;
}

export class UpsertInvoiceItemDto extends ProductListDto {}

export class CalculationEstimationDto extends ProductListDto {
  @ApiProperty({
    description: 'Type of the order',
    required: true,
    example: 'take_away',
  })
  @IsString()
  public orderType: order_type;
  paymentAmount?: number;
  provider?: string;
  @ApiProperty({
    description: 'Voucher ID that applied to the order (optional)',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  @IsOptional()
  public voucherId?: string;
}
