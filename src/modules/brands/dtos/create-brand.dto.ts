import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Brand name',
    required: true,
    example: 'Nike',
  })
  @IsNotEmpty()
  @IsString()
  brandName: string;

  @ApiProperty({
    description: 'Brand notes or description',
    required: false,
    example: 'Athletic and sportswear brand',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
