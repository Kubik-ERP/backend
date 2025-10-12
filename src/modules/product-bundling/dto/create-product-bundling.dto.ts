import { ApiProperty } from '@nestjs/swagger';
import { bundling_price_type } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateCatalogBundlingProducts {
  @ApiProperty({
    example: '1b2c3d4e-5f6g-7h8i-9j0k-lmnopqrstuv',
    required: true,
  })
  @IsString()
  @Type(() => String)
  productId: string;

  @ApiProperty({ example: 2, required: true })
  @IsNumber()
  @Type(() => Number)
  quantity: number;
}

export class CreateProductBundlingDto {
  @ApiProperty({ example: 'Produk Bundling A', required: true })
  @IsString()
  @Type(() => String)
  name: string;

  @ApiProperty({ example: 'Deskripsi Produk Bundling A', required: true })
  @IsString()
  @Type(() => String)
  description: string;

  @ApiProperty({ type: [CreateCatalogBundlingProducts], required: true })
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogBundlingProducts)
  products: CreateCatalogBundlingProducts[];

  @ApiProperty({ example: 'TOTAL_ITEMS', required: true })
  @IsEnum(bundling_price_type)
  type: bundling_price_type;

  @ApiProperty({ example: '10', required: true })
  @IsOptional()
  @Type(() => Decimal)
  @Transform(({ value }) => (value ? new Decimal(value) : undefined))
  discount?: Decimal;

  @ApiProperty({ example: '100000', required: true })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  image?: string;
}
