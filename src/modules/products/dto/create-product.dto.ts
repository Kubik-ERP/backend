import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCategoryDto } from '../../categories/dto/create-category.dto';
import { CreateVariantDto } from '../../variants/dto/create-variant.dto';
import { SimpleCategoryDto } from './simple-category.dto';

class VariantDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  picture_url?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  discount_price?: number;

  @IsOptional()
  @IsBoolean()
  isDiscount?: boolean;

  @IsOptional()
  @IsNumber()
  discount_value?: number;

  @IsOptional()
  @IsString()
  discount_unit?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimpleCategoryDto)
  categories: SimpleCategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
