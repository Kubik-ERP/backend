import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsNotEmpty()
  @ApiPropertyOptional({
    name: 'category',
    type: String,
    example: 'Category 1',
  })
  category: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    name: 'description',
    type: String,
    example: 'Description 1',
  })
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
