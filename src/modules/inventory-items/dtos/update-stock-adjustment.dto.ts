import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
}
