import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class WasteLogItemDto {
  @ApiProperty({
    description: 'Inventory item ID related to the waste',
    example: '7b7ac4e0-83bf-4dcf-92dd-6f1ab4b0faa2',
  })
  @IsUUID()
  @IsNotEmpty()
  inventoryItemId: string;

  @ApiProperty({
    description: 'Quantity of waste',
    example: 2.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement used for the waste quantity',
    example: 'kg',
    required: false,
  })
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiProperty({
    description: 'Category label for the waste item',
    example: 'Vegetables',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Additional notes for the waste item',
    example: 'Spoiled during storage',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Photo URL evidencing the waste',
    example: 'https://cdn.example.com/images/waste/photo-1.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class WasteLogDto {
  @ApiProperty({
    description: 'Collection of waste items recorded for this batch',
    type: [WasteLogItemDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WasteLogItemDto)
  items: WasteLogItemDto[];
}

export class CompleteBatchRecipeDto {
  @ApiProperty({
    description: 'Total waste for this batch (in batch unit)',
    example: 1.25,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  batchWaste?: number;

  @ApiProperty({
    description: 'Additional notes (will overwrite existing notes)',
    example: 'Completed with slight waste',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Waste log data to be stored',
    required: false,
    type: WasteLogDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WasteLogDto)
  wasteLog?: WasteLogDto;
}
