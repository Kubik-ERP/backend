import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewImportSuppliersDto {
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

export class ImportSuppliersPreviewResponseDto {
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
        supplier_name: { type: 'string', description: 'Supplier name' },
        contact_person: { type: 'string', description: 'Contact person name' },
        phone_number: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address' },
        address: { type: 'string', description: 'Address' },
        supplier_code: {
          type: 'string',
          description: 'Supplier code (auto-generated if empty)',
        },
        bank_name: { type: 'string', description: 'Bank name' },
        bank_account_number: {
          type: 'string',
          description: 'Bank account number',
        },
        bank_account_name: { type: 'string', description: 'Bank account name' },
        npwp: {
          type: 'string',
          description: 'Tax identification number (NPWP)',
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
        supplier_name: { type: 'string', description: 'Supplier name' },
        contact_person: { type: 'string', description: 'Contact person name' },
        phone_number: { type: 'string', description: 'Phone number' },
        email: { type: 'string', description: 'Email address' },
        address: { type: 'string', description: 'Address' },
        supplier_code: { type: 'string', description: 'Supplier code' },
        bank_name: { type: 'string', description: 'Bank name' },
        bank_account_number: {
          type: 'string',
          description: 'Bank account number',
        },
        bank_account_name: { type: 'string', description: 'Bank account name' },
        npwp: {
          type: 'string',
          description: 'Tax identification number (NPWP)',
        },
        error_messages: {
          type: 'string',
          description: 'Validation error messages',
        },
      },
    },
  })
  failed_data: any[];

  @ApiProperty({
    description: 'Summary of the import preview process',
    type: 'object',
    properties: {
      message: { type: 'string' },
      hasErrors: { type: 'boolean' },
      readyToImport: { type: 'boolean' },
    },
  })
  summary: {
    message: string;
    hasErrors: boolean;
    readyToImport: boolean;
  };
}
