import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file to import',
  })
  file: any;

  @ApiProperty({
    example: '12345678-1234-1234-1234-123456789012',
    description:
      'Optional batch ID. If provided, previous data with this batch ID will be deleted before importing new data',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Batch ID must be a valid UUID v4' })
  @IsString()
  batchId?: string;
}

export class ImportPreviewResponseDto {
  @ApiProperty({
    example: '12345678-1234-1234-1234-123456789012',
    description: 'Unique batch ID for this import session',
  })
  batch_id: string;

  @ApiProperty({
    example: 10,
    description: 'Total number of rows processed',
  })
  total_rows: number;

  @ApiProperty({
    example: 8,
    description: 'Number of rows with valid data',
  })
  valid_rows: number;

  @ApiProperty({
    example: 2,
    description: 'Number of rows with validation errors',
  })
  invalid_rows: number;

  @ApiProperty({
    description: 'Successfully validated data ready for import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Temporary ID for this row' },
        row_number: { type: 'number', description: 'Excel row number' },
        item_name: { type: 'string', description: 'Item name' },
        brand: { type: 'string', description: 'Brand in ID | Name format' },
        barcode: { type: 'string', description: 'Product barcode' },
        sku: { type: 'string', description: 'Stock Keeping Unit' },
        category: {
          type: 'string',
          description: 'Category in ID | Name format',
        },
        unit: { type: 'string', description: 'Unit of measurement' },
        notes: { type: 'string', description: 'Additional notes' },
        stock_quantity: {
          type: 'number',
          description: 'Current stock quantity',
        },
        minimum_stock_quantity: {
          type: 'number',
          description: 'Minimum stock threshold',
        },
        reorder_level: { type: 'number', description: 'Reorder level' },
        expiry_date: {
          type: 'string',
          description: 'Expiry date (YYYY-MM-DD)',
        },
        storage_location: {
          type: 'string',
          description: 'Storage location in ID | Name format',
        },
        price_per_unit: { type: 'number', description: 'Price per unit' },
        supplier: {
          type: 'string',
          description: 'Supplier in ID | Name format',
        },
      },
    },
  })
  success_data: any[];

  @ApiProperty({
    description: 'Data with validation errors that failed to import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Temporary ID for this row' },
        row_number: { type: 'number', description: 'Excel row number' },
        item_name: { type: 'string', description: 'Item name' },
        brand: { type: 'string', description: 'Brand value from Excel' },
        barcode: { type: 'string', description: 'Product barcode' },
        sku: { type: 'string', description: 'Stock Keeping Unit' },
        category: { type: 'string', description: 'Category value from Excel' },
        unit: { type: 'string', description: 'Unit of measurement' },
        notes: { type: 'string', description: 'Additional notes' },
        stock_quantity: {
          type: 'number',
          description: 'Current stock quantity',
        },
        minimum_stock_quantity: {
          type: 'number',
          description: 'Minimum stock threshold',
        },
        reorder_level: { type: 'number', description: 'Reorder level' },
        expiry_date: { type: 'string', description: 'Expiry date' },
        storage_location: {
          type: 'string',
          description: 'Storage location value from Excel',
        },
        price_per_unit: { type: 'number', description: 'Price per unit' },
        supplier: { type: 'string', description: 'Supplier value from Excel' },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
        },
      },
    },
  })
  failed_data: any[];
}
