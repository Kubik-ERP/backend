import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportInventoryCategoriesDto {
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
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsUUID('4', { message: 'Batch ID must be a valid UUID v4' })
  batchId?: string;
}

export class ImportInventoryCategoriesPreviewResponseDto {
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
        category_name: { type: 'string', description: 'Category name' },
        category_code: { type: 'string', description: 'Category code' },
        description: { type: 'string', description: 'Category description' },
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
        category_name: { type: 'string', description: 'Category name' },
        category_code: { type: 'string', description: 'Category code' },
        description: { type: 'string', description: 'Category description' },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
        },
      },
    },
  })
  failed_data: any[];
}
