import { ApiProperty } from '@nestjs/swagger';
import { benefit_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateItemBenefitDto {
  @ApiProperty({
    example: '1b2c3d4e-5f6g-7h8i-9j0k-lmnopqrstuv',
    required: true,
  })
  @IsString()
  @Type(() => String)
  productId: string;

  @ApiProperty({ example: 2, required: true })
  @IsNumber()
  @Type(() => Number)
  quantity: number;
}

export class CreateBenefitDto {
  @ApiProperty({
    example: 'free_items',
    required: true,
  })
  @IsEnum(benefit_type)
  benefitType: benefit_type;

  @ApiProperty({ example: 'Free Shipping', required: true })
  @IsString()
  @Type(() => String)
  benefitName: string;

  @ApiProperty({ example: 100, required: true })
  @IsNumber()
  @Type(() => Number)
  pointNeeds: number;

  @ApiProperty({ example: '10', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  value?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Type(() => Boolean)
  isPercent?: boolean;

  @ApiProperty({ type: [CreateItemBenefitDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateItemBenefitDto)
  items?: CreateItemBenefitDto[];
}
