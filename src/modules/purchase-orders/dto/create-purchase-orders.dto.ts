import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderItems {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Master Item ID',
    required: true,
  })
  @IsUUID()
  masterItemId: string;

  @ApiProperty({
    example: 1,
    description: 'Quantity',
    required: true,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  //NOTE: Dibawah ini tidak diolah backend
  // diadakan karena harus menyesuaikan dengan yang ada di frontend

  @IsOptional()
  id: string;

  @IsOptional()
  name: string;

  @IsOptional()
  brandName: string;

  @IsOptional()
  sku: string;

  @IsOptional()
  unit: string;

  @IsOptional()
  unitPrice: number;

  @IsOptional()
  totalPrice: number;
}

export class CreatePurchaseOrdersDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Supplier ID',
    required: true,
  })
  @IsUUID()
  supplierId: string;

  @ApiProperty({
    example: '2025-08-10T00:00:00.000Z',
    description: 'Order date',
    required: true,
  })
  @IsDateString()
  orderDate: string;

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
  @Type(() => PurchaseOrderItems)
  productItems: PurchaseOrderItems[];
}
