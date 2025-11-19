import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderItems {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Purchase Order Item ID',
    required: true,
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 10,
    description: 'Actual Quantity',
    required: true,
  })
  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @ApiProperty({
    example: 'Notes',
    description: 'Notes (optional)',
    required: false,
  })
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

export class ReceivePurchaseOrderDto {
  @ApiProperty({
    example: 1,
    description: 'Receiver (User ID)',
    required: true,
  })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    example: [
      {
        id: 'Lebih 1',
        actualQuantity: 10,
        notes: 'Notes',
        expiredAt: '2025-12-31',
      },
    ],
    description: 'Purchase Order Items',
    required: true,
  })
  @ValidateNested()
  @Type(() => PurchaseOrderItems)
  productItems: PurchaseOrderItems[];
}
