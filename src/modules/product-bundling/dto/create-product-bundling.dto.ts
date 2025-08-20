import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

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
}
