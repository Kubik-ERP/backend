import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferStockItemDto {
  @ApiProperty({ example: 'prod-uuid-1234', description: 'ID item produk' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 5, description: 'Jumlah item yang ditransfer' })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateTransferStockDto {
  @ApiProperty({ example: 'store-to-uuid', description: 'ID store penerima' })
  @IsUUID()
  @IsOptional()
  store_to_id: string;

  @ApiProperty({
    example: 'Transfer stok barang kebutuhan cabang Bogor',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: [TransferStockItemDto],
    example: [
      { itemId: 'prod-uuid-1', qty: 10 },
      { itemId: 'prod-uuid-2', qty: 5 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferStockItemDto)
  items: TransferStockItemDto[];
}
