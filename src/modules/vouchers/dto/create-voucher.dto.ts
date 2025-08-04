import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class HasProductsDto {
  @IsIn(['all', 'specific'])
  type: 'all' | 'specific';

  @IsArray()
  @IsUUID(undefined, { each: true })
  products: string[];
}

export class CreateVoucherDto {
  @ApiProperty({
    example: 'Voucher Ramadhan',
    description: 'Nama voucher',
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'PROMO123', required: false })
  @IsNotEmpty()
  @IsString()
  promoCode: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ example: '2024-02-01T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startPeriod?: string;

  @ApiProperty({ example: '2026-01-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endPeriod?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quota?: number;

  @ApiProperty({ example: false, required: false })
  @Type(() => Boolean)
  isPercent: boolean = false;

  @ApiProperty({
    example: {
      type: 'specific',
      products: [
        'f0b646e1-e847-4772-b538-e3b66068432c',
        'f0b646e1-e847-4772-b538-e3b66068432d',
      ],
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HasProductsDto)
  hasProducts?: HasProductsDto;
}
