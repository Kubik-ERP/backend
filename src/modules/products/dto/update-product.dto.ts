import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCategoryDto } from '../../categories/dto/create-category.dto';
import { CreateVariantDto } from '../../variants/dto/create-variant.dto';

export class UpdateProductDto {
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
  @Type(() => CreateCategoryDto)
  categories: CreateCategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
