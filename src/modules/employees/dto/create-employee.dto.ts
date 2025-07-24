import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { gender } from '@prisma/client';

export class SocialMediaDto {
  @ApiProperty({ example: 'Instagram', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '@budi_santoso', required: false })
  @IsOptional()
  @IsString()
  account?: string;
}

export class ShiftDto {
  @ApiProperty({ example: 'Monday', required: false })
  @IsOptional()
  @IsString()
  day?: string;

  @ApiProperty({ example: '08:00', required: false })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({ example: '17:00', required: false })
  @IsOptional()
  @IsString()
  end_time?: string;
}

export class ProductCommissionDto {
  @ApiProperty({ example: 'product-uuid', required: false })
  @IsOptional()
  @IsString()
  product_id?: string;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Type(() => Boolean)
  is_percent?: boolean;
}

export class VoucherCommissionDto {
  @ApiProperty({ example: 'voucher-uuid', required: false })
  @IsOptional()
  @IsString()
  voucher_id?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @Type(() => Boolean)
  is_percent?: boolean;
}

export class CommissionDto {
  @ApiProperty({ type: [ProductCommissionDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductCommissionDto)
  productComission?: ProductCommissionDto[];

  @ApiProperty({ type: [VoucherCommissionDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VoucherCommissionDto)
  voucherCommission?: VoucherCommissionDto[];
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Budi Santoso', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'budi.santoso@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '+62', required: false })
  @IsOptional()
  @IsString()
  phoneCode?: string;

  @ApiProperty({ example: '81234567890', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '2024-02-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-01-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: gender, example: 'MALE', required: false })
  @IsOptional()
  @IsString()
  gender?: gender;

  @ApiProperty({ example: 'Warehouse Staff', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'SUPERVISOR', required: false })
  @IsOptional()
  @IsString()
  permission?: string;

  @ApiProperty({ type: [SocialMediaDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto[];

  @ApiProperty({ type: [ShiftDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shift?: ShiftDto[];

  @ApiProperty({ type: CommissionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommissionDto)
  comissions?: CommissionDto;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  profilePicture?: string;
}
