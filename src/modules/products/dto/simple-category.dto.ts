// src/categories/dto/simple-category.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class SimpleCategoryDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}
