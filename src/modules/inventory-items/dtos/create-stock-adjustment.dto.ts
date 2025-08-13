import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum StockAdjustmentActionDto {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
}

export class CreateStockAdjustmentDto {
  @ApiProperty({
    enum: StockAdjustmentActionDto,
    example: StockAdjustmentActionDto.STOCK_IN,
  })
  @IsEnum(StockAdjustmentActionDto)
  action: StockAdjustmentActionDto;

  @ApiProperty({ example: 10, minimum: 1 })
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  adjustmentQuantity: number;

  @ApiPropertyOptional({ example: 'Initial stock count' })
  @IsOptional()
  @IsString()
  notes?: string;
}
