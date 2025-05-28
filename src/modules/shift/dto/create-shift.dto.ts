import { IsOptional, IsDateString, IsUUID, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiPropertyOptional({ type: String, example: '2025-05-29T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiPropertyOptional({ type: String, example: '2025-05-29T17:00:00Z' })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiPropertyOptional({
    type: Number,
    example: 1,
    description: 'Integer representation of days (e.g., 1 = Monday)',
  })
  @IsOptional()
  @IsInt()
  days?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    example: 'd3b07384-d9a1-4c38-a64d-17cb9ed3bc0e',
  })
  @IsUUID()
  employees_id: string;
}
