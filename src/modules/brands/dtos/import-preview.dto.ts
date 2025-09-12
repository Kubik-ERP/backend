import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportBrandsDto {
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

export class ImportBrandsPreviewResponseDto {
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
        brand_name: { type: 'string', description: 'Brand name' },
        brand_code: { type: 'string', description: 'Brand code' },
        description: { type: 'string', description: 'Brand description' },
      },
    },
  })
  success_data: Array<{
    id: string;
    row_number: number;
    brand_name: string;
    brand_code: string;
    description?: string;
  }>;

  @ApiProperty({
    description: 'Data with validation errors that failed to import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Temporary ID for this row' },
        row_number: { type: 'number', description: 'Excel row number' },
        brand_name: {
          type: 'string',
          description: 'Brand name value from Excel',
        },
        brand_code: {
          type: 'string',
          description: 'Brand code value from Excel',
        },
        description: {
          type: 'string',
          description: 'Brand description value from Excel',
        },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
        },
      },
    },
  })
  failed_data: Array<{
    id: string;
    row_number: number;
    brand_name: string;
    brand_code: string;
    description?: string;
    error_messages: string;
  }>;
}
