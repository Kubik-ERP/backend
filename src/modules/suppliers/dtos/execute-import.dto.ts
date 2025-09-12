import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ExecuteImportSuppliersDto {
  @ApiProperty({
    description: 'Batch ID from the preview import',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'batchId must be a valid UUID v4' })
  batchId: string;
}

export class ExecuteImportSuppliersResponseDto {
  @ApiProperty({
    description: 'Total number of suppliers processed',
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of suppliers successfully imported',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of suppliers that failed to import',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'List of failed suppliers with error messages',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        supplierName: { type: 'string' },
        supplierCode: { type: 'string' },
        errorMessage: { type: 'string' },
      },
    },
  })
  failedSuppliers: Array<{
    rowNumber: number;
    supplierName: string;
    supplierCode: string;
    errorMessage: string;
  }>;
}
