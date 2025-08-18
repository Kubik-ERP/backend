import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetItemSuppliesDto {
  @ApiProperty({ description: 'Page number', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Search by SKU or item name',
    required: false,
    example: 'FNB-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Start date (filter created_at of items)',
    required: false,
    example: '2024-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (filter created_at of items)',
    required: false,
    example: '2024-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Order by field',
    required: false,
    example: 'order_date',
    enum: ['sku', 'price_per_unit', 'expiry_date', 'order_date'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['sku', 'price_per_unit', 'expiry_date', 'order_date'])
  orderBy?: 'sku' | 'price_per_unit' | 'expiry_date' | 'order_date' =
    'order_date';

  @ApiProperty({
    description: 'Sort direction',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'desc';
}
