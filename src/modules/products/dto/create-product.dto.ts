import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from '../../variants/dto/create-variant.dto';
import { SimpleCategoryDto } from './simple-category.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'name',
    type: String,
    required: true,
    example: 'Product Name',
    description: 'Nama produk',
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    name: 'picture_url',
    type: String,
    example: 'https://example.com/image.jpg',
    description: 'URL gambar produk',
  })
  picture_url?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    name: 'price',
    type: Number,
    example: 199.99,
    description: 'Harga asli produk',
  })
  price?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    name: 'discount_price',
    type: Number,
    example: 149.99,
    description: 'Harga setelah diskon',
  })
  discount_price?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    name: 'isDiscount',
    type: Boolean,
    example: true,
    description: 'Apakah produk sedang diskon?',
  })
  isDiscount?: boolean;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    name: 'discount_value',
    type: Number,
    example: 25,
    description: 'Nilai diskon (misal 25)',
  })
  discount_value?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    name: 'is_percent',
    type: 'boolean',
    example: 'true / false',
    description: 'penggunakan nilai dari discount value',
  })
  is_percent?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimpleCategoryDto)
  @ApiProperty({
    name: 'categories',
    type: [SimpleCategoryDto],
    description: 'Daftar kategori yang terkait',
  })
  categories: SimpleCategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  @ApiPropertyOptional({
    name: 'variants',
    type: [CreateVariantDto],
    description: 'Daftar varian produk',
  })
  variants?: CreateVariantDto[];
}
