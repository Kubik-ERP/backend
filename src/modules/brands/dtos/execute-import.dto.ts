import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ExecuteImportBrandsDto {
  @ApiProperty({
    description: 'Batch ID from the preview import',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'batchId must be a valid UUID v4' })
  batchId: string;
}

export class ExecuteImportBrandsResponseDto {
  @ApiProperty({
    description: 'Total number of brands processed',
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of brands successfully imported',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of brands that failed to import',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'List of failed brands with error messages',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        brandName: { type: 'string' },
        brandCode: { type: 'string' },
        errorMessage: { type: 'string' },
      },
    },
  })
  failedBrands: Array<{
    rowNumber: number;
    brandName: string;
    brandCode: string;
    errorMessage: string;
  }>;
}
