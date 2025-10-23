import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBatchRecipeDto {
  @ApiProperty({
    description: 'Reason for cancelling the batch',
    example: 'Insufficient ingredients',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}
