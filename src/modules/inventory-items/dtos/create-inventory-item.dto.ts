import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Item name', example: 'Flour 1kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Brand ID', example: 'uuid' })
  brandId: string;

  @ApiProperty({ description: 'Barcode', required: false, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiProperty({ description: 'SKU', example: 'SKU-001', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sku: string;

  @ApiProperty({ description: 'Category ID', example: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Unit', example: 'Karung 5 kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  unit: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Stock quantity', example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  stockQuantity: number;

  @ApiProperty({ description: 'Reorder level', example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  reorderLevel: number;

  @ApiProperty({
    description: 'Minimum stock quantity',
    example: 5,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  minimumStockQuantity: number;

  @ApiProperty({ description: 'Expiry date (YYYY-MM-DD)', required: false })
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ description: 'Storage Location ID', example: 'uuid' })
  storageLocationId: string;

  @ApiProperty({ description: 'Price per unit', example: 12000.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  pricePerUnit: number;

  @ApiProperty({ description: 'Supplier ID', example: 'uuid' })
  @IsUUID()
  supplierId: string;
}
