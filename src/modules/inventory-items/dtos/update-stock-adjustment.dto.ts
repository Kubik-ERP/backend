import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { StockAdjustmentActionDto } from './create-stock-adjustment.dto';

export class UpdateStockAdjustmentDto {
  @ApiPropertyOptional({ enum: StockAdjustmentActionDto })
  @IsOptional()
  @IsEnum(StockAdjustmentActionDto)
  action?: StockAdjustmentActionDto;

  @ApiPropertyOptional({ example: 8, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  adjustmentQuantity?: number;

  @ApiPropertyOptional({ example: 'Correcting previous entry' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Expired At',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiredAt?: Date;
}
