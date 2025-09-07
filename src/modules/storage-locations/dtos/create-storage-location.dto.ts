import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStorageLocationDto {
  @ApiProperty({ description: 'Storage location name', example: 'Warehouse A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description:
      'Storage location code. If not provided, will be auto-generated based on location name. ' +
      'Auto-generation rules: 2+ words = first letter of first 2 words, ' +
      '1 word = first 2 letters, followed by 4-digit counter (e.g., WA0001)',
    required: false,
    example: 'WA0001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
