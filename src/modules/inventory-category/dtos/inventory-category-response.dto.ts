import { ApiProperty } from '@nestjs/swagger';

export class InventoryCategoryResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Bahan Baku' })
  name: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ example: new Date().toISOString() })
  created_at?: Date;

  @ApiProperty({ example: new Date().toISOString() })
  updated_at?: Date;
}
