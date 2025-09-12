import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ExecuteImportStorageLocationsDto {
  @ApiProperty({
    description: 'Batch ID to execute import for',
    example: 'abc123def-456g-789h-012i-345j678k901l',
  })
  @IsUUID('4', { message: 'Batch ID must be a valid UUID v4' })
  batchId: string;
}

export class ExecuteImportStorageLocationsResponseDto {
  @ApiProperty({
    description: 'Total number of records processed',
    example: 8,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of successfully imported records',
    example: 7,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed imports',
    example: 1,
  })
  failureCount: number;

  @ApiProperty({
    description: 'List of failed items with error details',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        rowNumber: {
          type: 'number',
          description: 'Excel row number that failed',
          example: 6,
        },
        locationName: {
          type: 'string',
          description: 'Storage location name that failed to import',
          example: 'Duplicate Location',
        },
        locationCode: {
          type: 'string',
          description: 'Storage location code that failed to import',
          example: 'DL001',
        },
        errorMessage: {
          type: 'string',
          description: 'Error message explaining why import failed',
          example: 'Location name already exists in this store',
        },
      },
    },
  })
  failedItems: any[];
}
