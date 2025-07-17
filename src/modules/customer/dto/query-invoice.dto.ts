import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { order_type } from '@prisma/client';

export class QueryInvoiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'partial'], {
    message: 'Invalid payment_status',
  })
  payment_status?: 'unpaid' | 'paid' | 'partial';

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(order_type, { each: true, message: 'Invalid order_type' })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  order_type?: order_type[];

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
