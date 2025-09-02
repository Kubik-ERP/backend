import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';

export enum RoundingType {
  UP = 'up',
  DOWN = 'down',
}

export class CreateOrUpdatePaymentRoundingSettingDto {
  @ApiProperty({
    description: 'Whether rounding is enabled or not',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({
    description: 'Type of rounding (up or down)',
    example: 'up',
    enum: RoundingType,
    enumName: 'RoundingType',
  })
  @IsEnum(RoundingType)
  @IsNotEmpty()
  roundingType: RoundingType;

  @ApiProperty({
    description: 'Rounding value (e.g., 100 for round to nearest 100)',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  roundingValue: number;
}

export class PaymentRoundingSettingResponseDto {
  @ApiProperty({ description: 'Setting ID' })
  id: string;

  @ApiProperty({ description: 'Store ID' })
  storeId: string;

  @ApiProperty({ description: 'Whether rounding is enabled' })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Rounding type',
    enum: RoundingType,
    enumName: 'RoundingType',
  })
  roundingType: RoundingType;

  @ApiProperty({ description: 'Rounding value' })
  roundingValue: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
