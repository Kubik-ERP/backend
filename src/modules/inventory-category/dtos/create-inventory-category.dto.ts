import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInventoryCategoryDto {
  @ApiProperty({ description: 'Nama kategori', example: 'Bahan Baku' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Category code. If not provided, will be auto-generated based on category name. ' +
      'Auto-generation rules: 2+ words = first letter of first 2 words, ' +
      '1 word = first 2 letters, followed by 4-digit counter (e.g., BB0001)',
    required: false,
    example: 'BB0001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Catatan kategori', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
