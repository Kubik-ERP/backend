import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDiscountPriceDto {
  @ApiProperty({ example: ['Produk A', 'Produk B'], required: true })
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Type(() => Boolean)
  isPercent?: boolean;

  @ApiProperty({ example: '10', required: true })
  @IsNumber()
  @Type(() => Number)
  value: number;
}
