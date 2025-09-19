import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteBatchProductsDto {
  @ApiProperty()
  @IsUUID('4')
  batchId: string;
}

export class DeleteBatchProductsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  deletedCount?: number;
}
