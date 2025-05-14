import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;
}
