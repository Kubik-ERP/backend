import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInventoryCategoryDto {
  @ApiProperty({ description: 'Nama kategori', example: 'Bahan Baku' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Catatan kategori', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
