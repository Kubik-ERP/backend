import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateOrUpdatePaymentRoundingSettingDto {
  @ApiProperty({
    description: 'Whether rounding is enabled or not',
    example: true,
  })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({
    description: 'Type of rounding (up, down, nearest)',
    example: 'nearest',
    enum: ['up', 'down', 'nearest'],
  })
  @IsString()
  @IsNotEmpty()
  roundingType: string;

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

  @ApiProperty({ description: 'Rounding type' })
  roundingType: string;

  @ApiProperty({ description: 'Rounding value' })
  roundingValue: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}
