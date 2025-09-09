import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportStorageLocationsDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file to import',
    required: true,
  })
  file: Express.Multer.File;

  @ApiProperty({
    description:
      'Optional batch ID. If provided, previous data with this batch ID will be deleted before importing new data',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Batch ID must be a valid UUID v4' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  batchId?: string;
}

export class ImportStorageLocationsPreviewResponseDto {
  @ApiProperty({
    description: 'Unique batch ID for this import session',
    example: 'abc123def-456g-789h-012i-345j678k901l',
  })
  batchId: string;

  @ApiProperty({
    description: 'Total number of rows processed from Excel',
    example: 10,
  })
  totalRows: number;

  @ApiProperty({
    description: 'Number of rows that passed validation',
    example: 8,
  })
  validRows: number;

  @ApiProperty({
    description: 'Number of rows that failed validation',
    example: 2,
  })
  invalidRows: number;

  @ApiProperty({
    description: 'Successfully validated data ready for import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Temporary ID (batch ID)',
          example: 'abc123def-456g-789h-012i-345j678k901l',
        },
        row_number: {
          type: 'number',
          description: 'Excel row number',
          example: 5,
        },
        location_name: {
          type: 'string',
          description: 'Storage location name',
          example: 'Main Warehouse',
        },
        location_code: {
          type: 'string',
          description: 'Storage location code (auto-generated if empty)',
          example: 'MW0001',
        },
        description: {
          type: 'string',
          description: 'Storage location notes/description',
          example: 'Primary storage area for inventory',
        },
      },
    },
  })
  successData: any[];

  @ApiProperty({
    description: 'Data with validation errors that failed to import',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Temporary ID (batch ID)',
          example: 'abc123def-456g-789h-012i-345j678k901l',
        },
        row_number: {
          type: 'number',
          description: 'Excel row number',
          example: 6,
        },
        location_name: {
          type: 'string',
          description: 'Storage location name (may be invalid)',
          example: '',
        },
        location_code: {
          type: 'string',
          description: 'Storage location code (may be invalid)',
          example: 'DUPLICATE001',
        },
        description: {
          type: 'string',
          description: 'Storage location notes/description',
          example: 'Some description',
        },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
          example: 'Location name is required; Location code already exists',
        },
      },
    },
  })
  failedData: any[];
}
