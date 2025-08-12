import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  CreatePurchaseOrdersDto,
  PurchaseOrderItems,
} from './create-purchase-orders.dto';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseOrderItemsUpdate extends PurchaseOrderItems {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'Purchase Order Item ID (if exists, means update, otherwise create)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  id: string;
}

export class UpdatePurchaseOrdersDto extends PartialType(
  CreatePurchaseOrdersDto,
) {
  @ApiProperty({
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        masterItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 1,
      },
    ],
    description: 'Purchase Order Items',
    required: true,
  })
  @ValidateNested()
  @Type(() => PurchaseOrderItemsUpdate)
  productItems: PurchaseOrderItemsUpdate[];
}
