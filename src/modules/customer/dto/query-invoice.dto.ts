import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsEnum(['dine_in', 'take_away', 'self_order'], {
    message: 'Invalid order_type',
  })
  order_type?: 'dine_in' | 'take_away' | 'self_order';

  @IsOptional()
  @IsDateString()
  created_at?: string;
}
