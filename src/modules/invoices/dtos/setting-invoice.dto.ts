import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
    description: 'logo perusahaan (opsional)',
  })
  @IsOptional()
  @IsString()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload (photo/logo)',
  })
  companyLogo?: string;

  @ApiPropertyOptional({
    description: 'Teks footer yang ditampilkan di invoice',
  })
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isAutomaticallyPrintReceipt: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isAutomaticallyPrintKitchen: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isAutomaticallyPrintTable: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowCompanyLogo: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowStoreLocation: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isHideCashierName: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isHideOrderType: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isHideQueueNumber: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowTableNumber: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isHideItemPrices: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowFooter: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowLoyaltyPointsUsed: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isShowTotalPointsAccumulated: boolean;

  @ApiPropertyOptional({ description: 'Jumlah kenaikan nomor invoice' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
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
  @Transform(({ value }) => parseInt(value))
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
