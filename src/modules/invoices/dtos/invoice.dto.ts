import { ApiProperty } from '@nestjs/swagger';
import { invoice_type, order_type } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Expose, Type, Transform } from 'class-transformer';

export class GetListInvoiceDto {
  @ApiProperty({
    description: 'Page of the list',
    required: true,
    example: '1',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number;

  @ApiProperty({
    description: 'Page size of the list',
    required: true,
    example: '10',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize: number;

  @ApiProperty({
    description: 'Ordet type of the invoice',
    required: false,
    example: 'take_away',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(order_type, { each: true })
  orderType?: order_type[];

  @ApiProperty({
    description: 'Payment status of the invoice',
    required: false,
    example: 'paid',
    isArray: true,
  })
  @IsOptional()
  @IsEnum(invoice_type, { each: true })
  paymentStatus?: invoice_type[];

  @ApiProperty({
    description: 'Start time of the invoice created time',
    required: false,
    example: '2025-05-15 03:28:31.430',
  })
  @Transform(({ value }) => {
    if (!value) return undefined; // ignore null, undefined, or empty string
    return new Date(value.replace(' ', 'T'));
  })
  @IsOptional()
  @IsDate()
  createdAtFrom: Date;

  @ApiProperty({
    description: 'End time of the invoice created time',
    required: false,
    example: '2025-05-15 03:28:31.430',
  })
  @Transform(({ value }) => {
    if (!value) return undefined; // ignore null, undefined, or empty string
    return new Date(value.replace(' ', 'T'));
  })
  @IsOptional()
  @IsDate()
  createdAtTo: Date;
}

export class GetInvoiceDto {
  @ApiProperty({
    description: 'ID of invoice',
    required: true,
    example: '01970571-bd68-7dfd-ba41-00aa890cc3db',
  })
  @IsString()
  invoiceId: string;
}

// Response DTO
export class ProductDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  discountPrice: number;

  @Expose()
  pictureUrl: string;
}

export class VariantDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  price: number;
}

export class InvoiceDetailDto {
  @Expose()
  id: string;

  @Expose()
  productId: string;

  @Expose()
  variantId: string;

  @Expose()
  orderType: string;

  @Expose()
  qty: number;

  @Expose()
  notes: string;

  @Expose()
  invoiceId: string;

  @Expose()
  productPrice: number;

  @Expose()
  variantPrice: number;

  @Expose()
  @Type(() => ProductDto)
  products: ProductDto;

  @Expose()
  @Type(() => VariantDto)
  variant: VariantDto;
}

export class CustomerDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  number: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  address: string;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : null,
  )
  dob: string;
}

export class PaymentMethodDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  iconName: string;

  @Expose()
  sortNo: number;

  @Expose()
  isAvailable: boolean;
}

export class InvoicePreviewDto {
  @Expose()
  id: string;

  @Expose()
  paymentMethodsId: string;

  @Expose()
  customerId: string;

  @Expose()
  discountAmount: number;

  @Expose()
  tableCode: string;

  @Expose()
  paymentStatus: string;

  @Expose()
  subtotal: number;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : null,
  )
  createdAt: string;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : null,
  )
  updatedAt: string;

  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value?.toISOString() : null,
  )
  deletedAt: string;

  @Expose()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @Expose()
  @Type(() => InvoiceDetailDto)
  invoiceDetails: InvoiceDetailDto[];

  @Expose()
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto;
}

// unexposed DTO to swagger
export class InvoiceUpdateDto {
  paymentMethodId?: string;
  customerId?: string;
  discountAmount?: number;
  tableCode?: string;
  paymentStatus?: invoice_type;
  subtotal?: number;
  orderType?: order_type;
  taxId?: string;
  serviceChargeId?: string;
  taxAmount?: number;
  serviceChargeAmount?: number;
  grandTotal?: number;
}
