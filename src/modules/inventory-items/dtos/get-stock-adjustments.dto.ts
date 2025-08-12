import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { StockAdjustmentActionDto } from './create-stock-adjustment.dto';

export class GetStockAdjustmentsDto {
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
    enum: StockAdjustmentActionDto,
  })
  @IsOptional()
  @IsEnum(StockAdjustmentActionDto)
  action?: StockAdjustmentActionDto;

  @ApiPropertyOptional({ description: 'Filter by storage location id' })
  @IsOptional()
  @IsUUID()
  storageLocationId?: string;
}
