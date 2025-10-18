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
import { Transform, Type } from 'class-transformer';

// DTO Product
export class ProductDto {
  @ApiProperty({
    description: 'Product ID',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsOptional()
  @IsString()
  public productId: string;

  @ApiProperty({
    description: 'Variant ID',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  @IsOptional()
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

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? 'single' : value,
  )
  public type: string = 'single';

  @IsString()
  @IsOptional()
  public bundlingId: string;

  @IsString()
  @IsOptional()
  public invoiceId: string;
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
  @IsString()
  @IsOptional()
  public customerId?: string | null;

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

  @ApiProperty({
    description: 'Loyalty redemption details',
    required: false,
    example: {
      loyalty_points_benefit_id: '1e38a39c-dbd5-4d8b-8df8-d88d792280fe',
    },
  })
  @IsOptional()
  public redeemLoyalty?: RedeemLoyaltyDto | null;
}

export class RedeemLoyaltyDto {
  @ApiProperty({
    description: 'The ID of the loyalty points benefit used for redemption',
    example: '1e38a39c-dbd5-4d8b-8df8-d88d792280fe',
  })
  @IsUUID()
  @IsOptional()
  public loyalty_points_benefit_id?: string;
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
  @IsOptional()
  public customerId?: string;

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

  @ApiProperty({
    description: 'Loyalty redemption details',
    required: false,
    example: {
      loyalty_points_benefit_id: '1e38a39c-dbd5-4d8b-8df8-d88d792280fe',
    },
  })
  @IsOptional()
  public redeemLoyalty?: RedeemLoyaltyDto | null;
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

  @ApiProperty({
    description: 'Payment amount for cash transactions',
    required: false,
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  public paymentAmount?: number;
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

  @IsString()
  @IsOptional()
  public customerId?: string | null;

  @ApiProperty({
    description: 'Loyalty redemption details',
    required: false,
    example: {
      loyalty_points_benefit_id: '1e38a39c-dbd5-4d8b-8df8-d88d792280fe',
    },
  })
  @IsOptional()
  public redeemLoyalty?: RedeemLoyaltyDto | null;
}
