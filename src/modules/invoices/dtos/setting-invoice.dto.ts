import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class SettingInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  storeId: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'URL logo perusahaan (opsional)',
  })
  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @ApiPropertyOptional({
    description: 'Teks footer yang ditampilkan di invoice',
  })
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isAutomaticallyPrintReceipt: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isAutomaticallyPrintKitchen: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isAutomaticallyPrintTable: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isShowCompanyLogo: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isShowStoreLocation: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isHideCashierName: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isHideOrderType: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isHideQueueNumber: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isShowTableNumber: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isHideItemPrices: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  isShowFooter: boolean;

  @ApiPropertyOptional({ description: 'Jumlah kenaikan nomor invoice' })
  @IsOptional()
  @IsInt()
  incrementBy?: number;

  @ApiPropertyOptional({
    description: 'Format/reset sequence invoice (misal: bulanan, tahunan)',
  })
  @IsOptional()
  @IsString()
  resetSequence?: string;

  @ApiPropertyOptional({ description: 'Nomor awal invoice' })
  @IsOptional()
  @IsInt()
  startingNumber?: number;
}

export class GetInvoiceSettingDto {
  @ApiProperty({
    description: 'Store ID',
    example: 'f3d8f7d2-0f1a-4db9-993b-d4a3c03741ff',
  })
  @IsUUID()
  storeId: string;
}
