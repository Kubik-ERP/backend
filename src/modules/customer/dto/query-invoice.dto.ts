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
import { Type } from 'class-transformer';

enum OrderTypeEnum {
  DINE_IN = 'dine_in',
  TAKE_AWAY = 'take_away',
  SELF_ORDER = 'self_order',
}

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
  @IsEnum(OrderTypeEnum, { each: true, message: 'Invalid order_type' })
  order_type?: OrderTypeEnum[];

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
