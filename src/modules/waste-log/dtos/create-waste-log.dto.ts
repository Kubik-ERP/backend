import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWasteLogItemDto {
  @ApiProperty({
    description: 'Inventory item ID',
    example: 'uuid-of-inventory-item',
  })
  @IsUUID()
  @IsNotEmpty()
  inventory_item_id: string;

  @ApiProperty({
    description: 'Category of waste',
    example: 'Expired',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({
    description: 'Quantity of wasted item',
    example: 10.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'kg',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  uom?: string;

  @ApiProperty({
    description: 'Notes about the waste',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}

export class CreateWasteLogDto {
  @ApiProperty({
    description: 'Batch ID for grouping waste logs',
    example: 'uuid-of-batch',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  batchId?: string;

  @ApiProperty({
    description:
      'Array of waste log items - Format: payload[0].inventory_item_id, payload[0].category, etc.',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        inventory_item_id: { type: 'string', format: 'uuid' },
        category: { type: 'string' },
        quantity: { type: 'number' },
        uom: { type: 'string' },
        notes: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
    example: [
      {
        inventory_item_id: 'uuid-of-inventory-item',
        category: 'Expired',
        quantity: 10.5,
        uom: 'kg',
        notes: 'Expired product',
        image: 'binary-file',
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  payload: CreateWasteLogItemDto[];
}
