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
  @ApiProperty({ example: 'Instagram' })
  @IsString()
  name: string;

  @ApiProperty({ example: '@budi_santoso' })
  @IsString()
  account: string;
}

export class ShiftDto {
  @ApiProperty({ example: 'Monday' })
  @IsString()
  day: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  start_time: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  end_time: string;
}

export class ProductCommissionDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  product_id: string;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ example: true })
  @Type(() => Boolean)
  is_percent: boolean;
}

export class VoucherCommissionDto {
  @ApiProperty({ example: 'voucher-uuid' })
  @IsString()
  voucher_id: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ example: false })
  @Type(() => Boolean)
  is_percent: boolean;
}

export class CommissionDto {
  @ApiProperty({ type: [ProductCommissionDto] })
  @ValidateNested({ each: true })
  @Type(() => ProductCommissionDto)
  productComission: ProductCommissionDto[];

  @ApiProperty({ type: [VoucherCommissionDto] })
  @ValidateNested({ each: true })
  @Type(() => VoucherCommissionDto)
  voucherCommission: VoucherCommissionDto[];
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'budi.santoso@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: '+62' })
  @IsString()
  phoneCode: string;

  @ApiProperty({ example: '81234567890' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '2024-02-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-31T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: gender, example: 'MALE' })
  @IsString()
  gender: gender;

  @ApiProperty({ example: 'Warehouse Staff' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'SUPERVISOR' })
  @IsString()
  permission: string;

  @ApiProperty({ type: [SocialMediaDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => SocialMediaDto)
  @IsOptional()
  socialMedia?: SocialMediaDto[];

  @ApiProperty({ type: [ShiftDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  @IsOptional()
  shift?: ShiftDto[];

  @ApiProperty({ type: CommissionDto, required: false })
  @ValidateNested()
  @Type(() => CommissionDto)
  @IsOptional()
  comissions?: CommissionDto;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  profilePicture?: string;
}
