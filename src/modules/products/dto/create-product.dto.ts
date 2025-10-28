import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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
  image?: string;

  @Type(() => Number)
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
  @Type(() => Number)
  @ApiPropertyOptional({
    name: 'discount_price',
    type: Number,
    example: 149.99,
    description: 'Harga setelah diskon',
  })
  discount_price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({
    name: 'discount_value',
    type: Number,
    example: 25,
    description: 'Nilai diskon (misal 25)',
  })
  discount_value?: number;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    name: 'is_percent',
    type: 'boolean',
    example: true,
    description: 'penggunaan nilai dari discount value',
  })
  is_percent?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SimpleCategoryDto)
  @ApiProperty({
    name: 'categories',
    type: [SimpleCategoryDto],
    description: 'Daftar kategori yang terkait',
  })
  categories?: SimpleCategoryDto[];

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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    name: 'isDiscount',
    type: 'boolean',
    example: true,
  })
  isDiscount?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({
    name: 'stock_quantity',
    type: Number,
    example: 100,
    description: 'Jumlah stok produk',
  })
  stock_quantity?: number;
}
