import { ApiProperty } from '@nestjs/swagger';
import { invoice_type, order_type } from '@prisma/client';
import {
  IsUUID,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { Transform } from 'class-transformer';

export class GetInvoiceDto {
  @ApiProperty({
    description: 'ID of invoice',
  })
  @IsUUID()
  invoiceId: string;
}

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
    description: 'Invoice number to search',
    required: false,
    example: '2025063000001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber: string;

  @ApiProperty({
    description: 'Order type of the invoice',
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

  @ApiProperty({
    description: 'Field to order by',
    required: false,
    example: 'created_at',
  })
  @IsIn(['created_at', 'invoice_number'])
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({
    description: 'Sort direction: asc or desc',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc';
}
