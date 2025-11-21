import { ApiProperty } from '@nestjs/swagger';

class TransferStockDataDto {
  @ApiProperty({ example: 'c78812aa-04e1-4361-b756-de90fe3d8b62' })
  id: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeFromId: string;

  @ApiProperty({ example: 'b4905df4-ac1f-4257-a463-18c9c7482f9b' })
  storeToId: string;

  @ApiProperty({ example: '097e4bc4-fda0-4a21-a96a-958a1668a88a' })
  storeCreatedBy: string;

  @ApiProperty({ example: 'TS-20251106-0001' })
  transactionCode: string;

  @ApiProperty({ example: 'drafted' })
  status: string;

  @ApiProperty({ example: 'Pengisian stok', nullable: true })
  note: string | null;

  @ApiProperty({ example: 129, nullable: true })
  draftedBy: number | null;

  @ApiProperty({ example: '2025-11-06T15:47:31.657Z', nullable: true })
  draftedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  approvedBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  approvedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  canceledBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  canceledAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  canceledNote: string | null;

  @ApiProperty({ example: null, nullable: true })
  shippedBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  shippedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  receivedBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  receivedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  deliveryNote: string | null;

  @ApiProperty({ example: null, nullable: true })
  logisticProvider: string | null;

  @ApiProperty({ example: null, nullable: true })
  trackingNumber: string | null;

  @ApiProperty({ example: '2025-11-06T15:47:31.657Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-11-06T15:47:31.657Z' })
  updatedAt: string;
}

export class CreateTransferStockResponseDto {
  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ example: 'Transfer stock created successfully' })
  message: string;

  @ApiProperty({ type: TransferStockDataDto })
  data: TransferStockDataDto;
}