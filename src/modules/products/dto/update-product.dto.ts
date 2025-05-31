import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'id',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID produk yang akan diperbarui',
  })
  id: string;
}
