// src/categories/dto/simple-category.dto.ts
import { IS_UUID, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SimpleCategoryDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
