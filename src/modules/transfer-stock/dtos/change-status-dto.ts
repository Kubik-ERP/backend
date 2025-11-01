import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum UpdateStatusEnum {
  APPROVED = 'approve',
  CANCEL = 'cancel',
  SHIP = 'ship',
}

export class ChangeStatusDto {
  @IsEnum(UpdateStatusEnum)
  status: UpdateStatusEnum;

  // === If status 'cancel' ===
  @ValidateIf((o) => o.status === UpdateStatusEnum.CANCEL)
  @IsString()
  note: string;

  // === If status 'ship' ===
  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  logistic_provider?: string;

  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  tracking_number?: string;

  @ValidateIf((o) => o.status === UpdateStatusEnum.SHIP)
  @IsOptional()
  @IsString()
  delivery_note?: string;
}