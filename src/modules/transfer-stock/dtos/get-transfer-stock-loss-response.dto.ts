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
  @ApiProperty({ example: '7b85eb04-5274-439f-a2f7-b0bdcfdce59b' })
  id: string;

  @ApiProperty({ example: '5b521382-a622-45a9-bd04-083fd48eb8e7' })
  transferStockId: string;

  @ApiProperty({ example: 'a0df2ccd-f6df-402e-8818-c85f08d750c0' })
  masterInventoryItemId: string;

  @ApiProperty({ example: true })
  hasDestinationProduct: boolean;

  @ApiProperty({ example: 25 })
  qtyReserved: number;

  @ApiProperty({ example: 0 })
  qtyReceived: number;

  @ApiProperty({ example: 3500 })
  unitPrice: number;

  @ApiProperty({ example: 87500 })
  subtotal: number;

  @ApiProperty({ example: 'received_with_issue' })
  status: string;

  @ApiProperty({ example: 'Barang rusak', nullable: true })
  note?: string | null;

  @ApiProperty({ example: '2025-11-10T09:23:54.305Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-10T09:24:35.522Z' })
  updatedAt: string;
}

export class TransferStockLossDetailDto {
  @ApiProperty({ example: 'e0a0709f-bced-4053-8059-56abbb8020ee' })
  id: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeId: string;

  @ApiProperty({ example: '5b521382-a622-45a9-bd04-083fd48eb8e7' })
  transferStockId: string;

  @ApiProperty({ example: '7b85eb04-5274-439f-a2f7-b0bdcfdce59b' })
  transferStockItemId: string;

  @ApiProperty({ example: 5 })
  qtyLost: number;

  @ApiProperty({ example: 3500 })
  unitPrice: number;

  @ApiProperty({ example: 17500 })
  lossAmount: number;

  @ApiProperty({ example: '2025-11-10T09:24:35.539Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-10T09:24:35.539Z' })
  updatedAt: string;

  @ApiProperty({ type: TransferStockDto })
  transferStock: TransferStockDto;

  @ApiProperty({ type: TransferStockItemDto })
  transferStockItem: TransferStockItemDto;
}

export class GetTransferStockLossResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Get transfer stock loss successfully' })
  message: string;

  @ApiProperty({ type: TransferStockLossDetailDto })
  data: TransferStockLossDetailDto;
}