import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class StockOpnameItems {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Master Inventory Item ID',
    required: true,
  })
  @IsUUID()
  masterInventoryItemId: string;

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
}

export class CreateStockOpnameDto {
  @ApiProperty({
    example: false,
    description: 'Publish now (false = draft, true = on_review)',
    required: true,
  })
  @IsBoolean()
  publishNow: boolean = false;

  @ApiProperty({
    example: [
      {
        masterInventoryItemId: '123e4567-e89b-12d3-a456-426614174000',
        actualQuantity: 10,
        notes: 'Notes',
      },
    ],
    description: 'Stock Opname Items',
    required: true,
  })
  @ValidateNested()
  @Type(() => StockOpnameItems)
  items: StockOpnameItems[];
}
