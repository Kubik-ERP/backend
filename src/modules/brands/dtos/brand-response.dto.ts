import { ApiProperty } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({
    description: 'Brand ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'Nike',
  })
  brandName: string;

  @ApiProperty({
    description: 'Brand notes or description',
    example: 'Athletic and sportswear brand',
  })
  notes?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
