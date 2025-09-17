import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportCategoriesDto {
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

export class ImportCategoriesPreviewResponseDto {
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
        id: { type: 'string' },
        row_number: { type: 'number' },
        category: { type: 'string' },
        description: { type: 'string', nullable: true },
      },
    },
  })
  success_data: Array<{
    id: string;
    row_number: number;
    category: string;
    description: string | null;
  }>;

  @ApiProperty({
    description: 'Data with validation errors that need to be fixed',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        row_number: { type: 'number' },
        category: { type: 'string' },
        description: { type: 'string', nullable: true },
        error_messages: { type: 'string' },
      },
    },
  })
  failed_data: Array<{
    id: string;
    row_number: number;
    category: string;
    description: string | null;
    error_messages: string;
  }>;
}
