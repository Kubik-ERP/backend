import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ExecuteImportInventoryCategoriesDto {
  @ApiProperty({
    description: 'Batch ID from the preview import',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'batchId must be a valid UUID v4' })
  batchId: string;
}

export class ExecuteImportInventoryCategoriesResponseDto {
  @ApiProperty({
    description: 'Total number of categories processed',
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of categories successfully imported',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of categories that failed to import',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'List of failed categories with error messages',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        categoryName: { type: 'string' },
        categoryCode: { type: 'string' },
        errorMessage: { type: 'string' },
      },
    },
  })
  failedItems: Array<{
    rowNumber: number;
    categoryName: string;
    categoryCode: string;
    errorMessage: string;
  }>;
}
