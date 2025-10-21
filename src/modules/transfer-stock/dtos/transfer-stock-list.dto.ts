import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TransferStockListDto {
  @ApiProperty({ example: 'd35f4b8c-3f9c-4b65-90b8-9a0a5a9e1a1d' })
  id: string;

  @ApiProperty({ example: 'TSK-2025-001' })
  transaction_code: string;

  @ApiProperty({ example: 'store-from-uuid' })
  store_from_id: string;

  @ApiProperty({ example: 'store-to-uuid' })
  store_to_id: string;

  @ApiProperty({ example: 'requested' })
  status: string;

  @ApiProperty({ example: 'Transfer untuk replenishment stok cabang Bogor' })
  note?: string;

  @ApiProperty({ example: 12 })
  requested_by?: number;

  @ApiProperty({ example: '2025-10-20T10:45:00.000Z' })
  request_at?: Date;

  @ApiProperty({ example: 7 })
  approved_by?: number;

  @ApiProperty({ example: '2025-10-21T09:00:00.000Z' })
  approved_at?: Date;

  @ApiProperty({ example: 15 })
  shipped_by?: number;

  @ApiProperty({ example: '2025-10-22T13:30:00.000Z' })
  shipped_at?: Date;

  @ApiProperty({ example: 20 })
  received_by?: number;

  @ApiProperty({ example: '2025-10-23T14:15:00.000Z' })
  received_at?: Date;

  @ApiProperty({ example: 'Nota pengiriman #12345' })
  delivery_note?: string;

  @ApiProperty({ example: 'JNE' })
  logistic_provider?: string;

  @ApiProperty({ example: 'JNE123456789ID' })
  tracking_number?: string;

  @ApiProperty({ example: '2025-10-20T10:45:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2025-10-20T10:45:00.000Z' })
  updated_at: Date;

  // Pagination
  @ApiProperty({
    description: 'Page of the list',
    required: true,
    example: '1',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page: number = 1;

  @ApiProperty({
    description: 'Page size of the list',
    required: true,
    example: '10',
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize: number = 10;

  // Order By
  @ApiProperty({
    description: 'Field to order by. (updatedAt)',
    required: false,
    example: 'updatedAt',
  })
  @IsOptional()
  @IsIn(['updatedAt'])
  @IsString()
  orderBy: string = 'updatedAt';

  @ApiProperty({
    description: 'Sort direction: asc or desc',
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  @IsString()
  orderDirection: 'asc' | 'desc' = 'desc';
}
