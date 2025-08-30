import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteBatchDto {
  @ApiProperty({
    description: 'Batch ID to delete from temp import table',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  batchId: string;
}

export class DeleteBatchResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Number of deleted records' })
  deletedCount: number;
}
