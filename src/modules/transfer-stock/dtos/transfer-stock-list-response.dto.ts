import { ApiProperty } from '@nestjs/swagger';

class UserInfoDto {
  @ApiProperty({ example: 129 })
  id: number;

  @ApiProperty({ example: 'Rizki Setiawan' })
  fullname: string;

  @ApiProperty({ example: 'rizki.se00@gmail.com' })
  email: string;
}

class TransferStockItemDto {
  @ApiProperty({ example: '83c3dacf-d058-4499-bb73-e1f859a5bc48' })
  id: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeFromId: string;

  @ApiProperty({ example: 'b4905df4-ac1f-4257-a463-18c9c7482f9b' })
  storeToId: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeCreatedBy: string;

  @ApiProperty({ example: 'TS-20251101-0002' })
  transactionCode: string;

  @ApiProperty({ example: 'shipped' })
  status: string;

  @ApiProperty({ example: 'Pengisian stok' })
  note: string;

  @ApiProperty({ example: 129 })
  draftedBy: number | null;

  @ApiProperty({ example: '2025-11-01T05:39:44.246Z' })
  draftedAt: string | null;

  @ApiProperty({ example: 129 })
  approvedBy: number | null;

  @ApiProperty({ example: '2025-11-01T05:42:57.501Z' })
  approvedAt: string | null;

  @ApiProperty({ example: 129 })
  canceledBy: number | null;

  @ApiProperty({ example: '2025-11-01T05:36:29.174Z' })
  canceledAt: string | null;

  @ApiProperty({ example: 'stock tidak cukup' })
  canceledNote: string | null;

  @ApiProperty({ example: 129 })
  shippedBy: number | null;

  @ApiProperty({ example: '2025-11-01T06:11:53.756Z' })
  shippedAt: string | null;

  @ApiProperty({ example: 129 })
  receivedBy: number | null;

  @ApiProperty({ example: '2025-11-01T06:11:53.756Z' })
  receivedAt: string | null;

  @ApiProperty({ example: 'Jangan di banting' })
  deliveryNote: string | null;

  @ApiProperty({ example: 'JNE' })
  logisticProvider: string | null;

  @ApiProperty({ example: 'JNE-001' })
  trackingNumber: string | null;

  @ApiProperty({ example: '2025-11-01T05:39:44.246Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-01T06:11:53.758Z' })
  updatedAt: string;

  @ApiProperty({ type: UserInfoDto })
  draftedUser: UserInfoDto | null;

  @ApiProperty({ type: UserInfoDto })
  approvedUser: UserInfoDto | null;

  @ApiProperty({ type: UserInfoDto })
  shippedUser: UserInfoDto | null;

  @ApiProperty({ type: UserInfoDto })
  receivedUser: UserInfoDto | null;

  @ApiProperty({ type: UserInfoDto })
  canceledUser: UserInfoDto | null;
}

class MetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

class DataDto {
  @ApiProperty({ type: [TransferStockItemDto] })
  items: TransferStockItemDto[];

  @ApiProperty({ type: MetaDto })
  meta: MetaDto;
}

export class TransferStockListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Transfer Stock fetched successfully' })
  message: string;

  @ApiProperty({ type: DataDto })
  data: DataDto;
}