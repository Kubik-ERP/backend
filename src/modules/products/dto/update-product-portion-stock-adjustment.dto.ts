import { PartialType } from '@nestjs/swagger';
import { CreateProductPortionStockAdjustmentDto } from './create-product-portion-stock-adjustment.dto';

export class UpdateProductPortionStockAdjustmentDto extends PartialType(
  CreateProductPortionStockAdjustmentDto,
) {}
