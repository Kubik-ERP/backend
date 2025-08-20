import { ApiProperty } from '@nestjs/swagger';
import { bundling_price_type } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductBundlingDto {
  @ApiProperty({ example: 'Produk Bundling A', required: true })
  @IsString()
  @Type(() => String)
  name: string;

  @ApiProperty({ example: 'Deskripsi Produk Bundling A', required: true })
  @IsString()
  @Type(() => String)
  description: string;

  @ApiProperty({
    type: [String],
    required: true,
  })
  @IsString({ each: true })
  productId: string[];

  @ApiProperty({ example: 'total items', required: true })
  @IsEnum(bundling_price_type)
  type: bundling_price_type;

  @ApiProperty({ example: '10', required: true })
  @IsNumber()
  @IsOptional()
  @Type(() => Decimal)
  discount?: Decimal;

  @ApiProperty({ example: '100000', required: true })
  @IsNumber()
  @Type(() => Number)
  price: number;
}
