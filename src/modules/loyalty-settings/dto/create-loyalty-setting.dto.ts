import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class AddProductLoyaltySettings {
  @ApiProperty({
    example: '1b2c3d4e-5f6g-7h8i-9j0k-lmnopqrstuv',
    required: true,
  })
  @IsUUID()
  @IsString()
  product_id: string;

  @ApiProperty({ example: 10, required: true })
  @IsNumber()
  @Type(() => Number)
  points_earned: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimum_purchase?: number;
}

export class CreateLoyaltySettingDto {
  @ApiProperty({
    example: true,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  spend_based: boolean;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  spend_based_min_transaction?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  spend_based_point_earned?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  spend_based_expiration?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  spend_based_apply_multiple?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  spend_based_earn_when_redeem?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  product_based: boolean;

  @ApiProperty({ type: [AddProductLoyaltySettings], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddProductLoyaltySettings)
  product_based_items?: AddProductLoyaltySettings[];

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  product_based_expiration?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  product_based_apply_multiple?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  product_based_earn_when_redeem?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  show_points_earned?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  show_points_redeemed?: boolean;
}
