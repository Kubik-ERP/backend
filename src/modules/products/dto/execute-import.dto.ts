import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ExecuteImportProductsDto {
  @ApiProperty()
  @IsUUID('4')
  batchId: string;
}

export class ExecuteImportProductsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ required: false })
  errors?: Array<{
    row_number: number;
    name: string;
    error_messages: string;
  }>;
}
