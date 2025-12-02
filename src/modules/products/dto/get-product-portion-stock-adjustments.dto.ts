import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ProductPortionActionDto } from './create-product-portion-stock-adjustment.dto';

export class GetProductPortionStockAdjustmentsDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product ID (optional if provided in URL parameter)',
  })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Store ID (optional if provided in X-STORE-ID header)',
  })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by action',
    enum: ProductPortionActionDto,
  })
  @IsOptional()
  @IsEnum(ProductPortionActionDto)
  action?: ProductPortionActionDto;
}
