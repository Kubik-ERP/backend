import { ApiProperty } from '@nestjs/swagger';

class TransferStockDto {
  @ApiProperty({ example: '5b521382-a622-45a9-bd04-083fd48eb8e7' })
  id: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeFromId: string;

  @ApiProperty({ example: 'b4905df4-ac1f-4257-a463-18c9c7482f9b' })
  storeToId: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeCreatedBy: string;

  @ApiProperty({ example: 'TS-20251110-0001' })
  transactionCode: string;

  @ApiProperty({ example: 'received_with_issue' })
  status: string;

  @ApiProperty({ example: 'Pengisian stok', nullable: true })
  note?: string | null;

  @ApiProperty({ example: 129, nullable: true })
  draftedBy?: number | null;

  @ApiProperty({ example: '2025-11-10T09:23:54.288Z', nullable: true })
  draftedAt?: string | null;

  @ApiProperty({ example: 129, nullable: true })
  approvedBy?: number | null;

  @ApiProperty({ example: '2025-11-10T09:24:12.484Z', nullable: true })
  approvedAt?: string | null;

  @ApiProperty({ example: null })
  canceledBy?: number | null;

  @ApiProperty({ example: null })
  canceledAt?: string | null;

  @ApiProperty({ example: null })
  canceledNote?: string | null;

  @ApiProperty({ example: 129 })
  shippedBy: number;

  @ApiProperty({ example: '2025-11-10T09:24:18.375Z' })
  shippedAt: string;

  @ApiProperty({ example: 129 })
  receivedBy: number;

  @ApiProperty({ example: '2025-11-10T09:24:35.532Z' })
  receivedAt: string;

  @ApiProperty({ example: 'Jangan di banting' })
  deliveryNote: string;

  @ApiProperty({ example: 'JNE' })
  logisticProvider: string;

  @ApiProperty({ example: 'JNE-001' })
  trackingNumber: string;

  @ApiProperty({ example: '2025-11-10T09:23:54.288Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-10T09:24:35.533Z' })
  updatedAt: string;
}

class TransferStockItemDto {
  @ApiProperty({ example: 'a9819a58-e865-44e6-8a76-30f3c63ce006' })
  id: string;

  @ApiProperty({ example: '5b521382-a622-45a9-bd04-083fd48eb8e7' })
  transferStockId: string;

  @ApiProperty({ example: 'f4fb8b18-b3bb-4349-8bd5-ab52cb067d31' })
  masterInventoryItemId: string;

  @ApiProperty({ example: true })
  hasDestinationProduct: boolean;

  @ApiProperty({ example: 15 })
  qtyReserved: number;

  @ApiProperty({ example: 0 })
  qtyReceived: number;

  @ApiProperty({ example: 5000 })
  unitPrice: number;

  @ApiProperty({ example: 75000 })
  subtotal: number;

  @ApiProperty({ example: 'received_with_issue' })
  status: string;

  @ApiProperty({ example: 'barang hilang', nullable: true })
  note?: string | null;

  @ApiProperty({ example: '2025-11-10T09:23:54.315Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-10T09:24:35.531Z' })
  updatedAt: string;
}

export class TransferStockLossItemDto {
  @ApiProperty({ example: 'e8c2253a-e0aa-45d2-b864-1cd99581969d' })
  id: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeId: string;

  @ApiProperty({ example: '5b521382-a622-45a9-bd04-083fd48eb8e7' })
  transferStockId: string;

  @ApiProperty({ example: 'a9819a58-e865-44e6-8a76-30f3c63ce006' })
  transferStockItemId: string;

  @ApiProperty({ example: 5 })
  qtyLost: number;

  @ApiProperty({ example: 5000 })
  unitPrice: number;

  @ApiProperty({ example: 25000 })
  lossAmount: number;

  @ApiProperty({ example: '2025-11-10T09:24:35.545Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-10T09:24:35.545Z' })
  updatedAt: string;

  @ApiProperty({ type: TransferStockDto })
  transferStock: TransferStockDto;

  @ApiProperty({ type: TransferStockItemDto })
  transferStockItem: TransferStockItemDto;
}

export class MetaPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class TransferStockLossDataDto {
  @ApiProperty({ type: [TransferStockLossItemDto] })
  items: TransferStockLossItemDto[];

  @ApiProperty({ type: MetaPaginationDto })
  meta: MetaPaginationDto;
}

export class TransferStockLossResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Transfer Stock Loss fetched successfully' })
  message: string;

  @ApiProperty({ type: TransferStockLossDataDto })
  data: TransferStockLossDataDto;
}
