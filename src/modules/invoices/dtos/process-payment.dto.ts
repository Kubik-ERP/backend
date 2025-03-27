// Class Validator
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// Enum
import { ordertype } from '@prisma/client';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// DTO Product
class ProductDto {
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
  @IsNotEmpty()
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

class ProductListDto {
  @ApiProperty({ type: [ProductDto], description: 'List of Products' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  public products: ProductDto[];
}

// DTO Invoice Detail
class InvoiceDetail {
  @ApiProperty({
    description: 'Received By',
    required: true,
    example: 'Samantha',
  })
  @IsString()
  @IsNotEmpty()
  public receivedBy: string;

  @ApiProperty({
    description: 'Notes of Invoice',
    required: false,
    example: 'Please add cutlery',
  })
  @IsNotEmpty()
  public notes: string;
}

export class ProcessPaymentDto extends ProductListDto {
  @ApiProperty({
    description: 'Provider of Payment Gateway',
    required: true,
    example: 'midtrans',
  })
  @IsNotEmpty()
  public provider: string;

  @ApiProperty({ description: 'Order Type', enum: ordertype, required: true })
  @IsNotEmpty()
  @IsEnum(ordertype)
  public orderType: ordertype;

  @ApiProperty({
    description: 'Payment Method ID',
    required: true,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsUUID()
  public paymentId: string;

  @ApiProperty({
    description: 'Selected Voucher ID',
    required: false,
    example: '6930b42f-c074-4aa4-b36d-87a9169c7204',
  })
  @IsString()
  public vouchers: string[];

  @ApiProperty({
    description: 'Customer Name',
    required: false,
    example: 'Christopher',
  })
  @IsString()
  public customerName: string;

  @ApiProperty({ description: 'Invoice Detail', required: false })
  @IsObject()
  public InvoiceDetail: InvoiceDetail;
}

export class CalculationEstimationDto extends ProductListDto {}
