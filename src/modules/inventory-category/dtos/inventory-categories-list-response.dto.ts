import { ApiProperty } from '@nestjs/swagger';
import { InventoryCategoryResponseDto } from './inventory-category-response.dto';

export class InventoryCategoriesListResponseDto {
  @ApiProperty({ type: [InventoryCategoryResponseDto] })
  items: InventoryCategoryResponseDto[];

  @ApiProperty({ example: 1 })
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
