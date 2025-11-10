import { ApiProperty } from '@nestjs/swagger';

export class WasteLogItemResponseDto {
  @ApiProperty()
  wasteLogItemId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  inventoryItemName?: string;

  @ApiProperty()
  category?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  uom?: string;

  @ApiProperty()
  notes?: string;

  @ApiProperty()
  photoUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class WasteLogResponseDto {
  @ApiProperty()
  wasteLogId: string;

  @ApiProperty()
  batchId?: string;

  @ApiProperty()
  storeId: string;

  @ApiProperty()
  storeName?: string;

  @ApiProperty({ type: [WasteLogItemResponseDto] })
  wasteLogItems: WasteLogItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class WasteLogListResponseDto {
  @ApiProperty({ type: [WasteLogResponseDto] })
  items: WasteLogResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
