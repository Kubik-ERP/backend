import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum ProductPortionActionDto {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

export class CreateProductPortionStockAdjustmentDto {
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

  @ApiProperty({
    enum: ProductPortionActionDto,
    example: ProductPortionActionDto.INCREASE,
    description: 'Action to perform on product stock',
  })
  @IsEnum(ProductPortionActionDto)
  action: ProductPortionActionDto;

  @ApiProperty({
    example: 10,
    minimum: 1,
    description: 'Quantity to adjust (positive number)',
  })
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  adjustmentQuantity: number;

  @ApiPropertyOptional({
    example: 'Stock adjustment for portion',
    description: 'Optional notes for the adjustment',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
