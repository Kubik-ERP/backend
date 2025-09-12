import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteBatchStorageLocationsDto {
  @ApiProperty({
    description: 'Batch ID to delete from temp import table',
    example: 'abc123def-456g-789h-012i-345j678k901l',
  })
  @IsUUID('4', { message: 'Batch ID must be a valid UUID v4' })
  batchId: string;
}

export class DeleteBatchStorageLocationsResponseDto {
  @ApiProperty({
    description: 'Whether the deletion was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message about the deletion result',
    example: 'Batch data deleted successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Number of records deleted',
    example: 5,
  })
  deletedCount: number;
}
