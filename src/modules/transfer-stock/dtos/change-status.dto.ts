import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum UpdateStatusEnum {
  APPROVE = 'approve',
  CANCEL = 'cancel',
  SHIP = 'ship',
}

export class ChangeStatusDto {
  @ApiProperty({
    description: 'Status baru untuk transfer stock',
    enum: UpdateStatusEnum,
    example: 'approve',
  })
  @IsEnum(UpdateStatusEnum)
  status: UpdateStatusEnum;

  // === Jika status 'cancel' ===
  @ApiPropertyOptional({
    description: 'Catatan pembatalan (jika status = cancel)',
    example: 'Stock tidak mencukupi',
  })
  @ValidateIf((o) => o.status === UpdateStatusEnum.CANCEL)
  @IsString()
  note?: string;

  // === Jika status 'ship' ===
  @ApiPropertyOptional({
    description: 'Nama penyedia logistik (jika status = ship)',
    example: 'JNE',
  })
  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  logistic_provider?: string;

  @ApiPropertyOptional({
    description: 'Nomor resi pengiriman (jika status = ship)',
    example: 'JNE-001',
  })
  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  tracking_number?: string;

  @ApiPropertyOptional({
    description: 'Catatan pengiriman (jika status = ship)',
    example: 'Harap jangan dibanting',
  })
  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  delivery_note?: string;
}
