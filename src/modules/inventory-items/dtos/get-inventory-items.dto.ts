import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetInventoryItemsDto {
  @ApiProperty({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 10;

  @ApiProperty({
    description: 'Search by name, sku, or barcode',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Order by field',
    example: 'created_at',
    enum: ['id', 'created_at', 'name', 'updated_at', 'sku'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['id', 'created_at', 'name', 'updated_at', 'sku'])
  orderBy?: string = 'created_at';

  @ApiProperty({
    description: 'Order direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'desc';
}
