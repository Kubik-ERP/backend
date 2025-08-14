import { ApiProperty } from '@nestjs/swagger';
import { BrandResponseDto } from './brand-response.dto';

export class BrandsListResponseDto {
  @ApiProperty({
    description: 'List of brands',
    type: [BrandResponseDto],
  })
  data: BrandResponseDto[];

  @ApiProperty({
    description: 'Total count of brands',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}
