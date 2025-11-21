import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Item name', example: 'Flour 1kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Brand ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ description: 'Barcode', required: false, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiProperty({ description: 'SKU', example: 'SKU-001', maxLength: 64 })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  sku?: string;

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
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  stockQuantity?: number;

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

  /**
   * @deprecated
   */
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

  @ApiProperty({ description: 'Price Grossir', example: 12000, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  priceGrosir: number;

  @ApiProperty({ description: 'Supplier ID', example: 'uuid' })
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description:
      'Unit conversions - JSON string format: [{"unitName":"Gram","unitSymbol":"g","value":1000}]',
    type: String,
    required: false,
    example:
      '[{"unitName":"Gram","unitSymbol":"g","value":1000},{"unitName":"Kilogram","unitSymbol":"kg","value":2000}]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle form data where conversions comes as JSON string
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If JSON parsing fails, return empty array
        return [];
      }
    }
    // If it's already an array, return as is
    return Array.isArray(value) ? value : [];
  })
  conversions?: any[];
}
