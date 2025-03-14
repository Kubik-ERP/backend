/* eslint-disable prettier/prettier */
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  discount_price?: number;

  @IsOptional()
  @IsString()
  picture_url?: string;
}
