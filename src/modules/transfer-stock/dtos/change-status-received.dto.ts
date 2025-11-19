import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransferStatus {
  RECEIVED = 'received',
  RECEIVED_WITH_ISSUE = 'received_with_issue',
}

export class ChangeStatusItemDto {
  @ApiProperty({
    description: 'ID item yang ditransfer',
    example: 'a0df2ccd-f6df-402e-8818-c85f08d750c0',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'Jumlah barang yang dikirim',
    example: 25,
  })
  @IsInt()
  @Min(0)
  qty_shipped: number;

  @ApiProperty({
    description: 'Jumlah barang yang diterima',
    example: 25,
  })
  @IsInt()
  @Min(0)
  qty_received: number;

  @ApiProperty({
    description: 'Catatan tambahan (opsional)',
    example: 'Beberapa item rusak',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeStatusReceiveDto {
  @ApiProperty({
    description: 'Status penerimaan transfer stock',
    enum: TransferStatus,
    example: 'received',
  })
  @IsEnum(TransferStatus)
  @IsNotEmpty()
  status: TransferStatus;

  @ApiProperty({
    description: 'Daftar item yang diterima atau bermasalah',
    type: [ChangeStatusItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeStatusItemDto)
  items: ChangeStatusItemDto[];
}
