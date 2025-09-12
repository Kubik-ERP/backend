import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteBatchBrandsDto {
  @ApiProperty({
    description: 'Batch ID to delete from temp table',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'batchId must be a valid UUID v4' })
  batchId: string;
}

export class DeleteBatchBrandsResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully deleted 10 records',
  })
  message: string;

  @ApiProperty({
    description: 'Number of records deleted',
    example: 10,
  })
  deletedCount: number;
}
