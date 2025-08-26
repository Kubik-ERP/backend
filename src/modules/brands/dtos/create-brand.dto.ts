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
    description:
      'Brand code - if not provided, will be auto-generated based on brand name',
    required: false,
    example: 'NK0001',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: 'Brand notes or description',
    required: false,
    example: 'Athletic and sportswear brand',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
