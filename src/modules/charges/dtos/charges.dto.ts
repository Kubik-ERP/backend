import { ApiProperty } from '@nestjs/swagger';
import { charge_type } from '@prisma/client';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class UpsertChargeDto {
  @ApiProperty({
    description: 'Charge name',
    required: true,
    example: 'PB1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Charge percentage',
    required: true,
    example: '0.1',
  })
  @IsNumber()
  percentage: number;

  @ApiProperty({
    description: 'Applied the include or exclude charge',
    required: true,
    example: 'true',
  })
  @IsBoolean()
  isInclude: boolean;

  @ApiProperty({
    description: 'Applied charge to takeaway order',
    required: true,
    example: 'true',
  })
  @IsBoolean()
  appliedToTakeaway: boolean;

  @ApiProperty({
    description: 'Availability of the charge',
    required: true,
    example: 'true',
  })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({
    description: 'Type of the charge',
    required: true,
    example: 'tax',
  })
  @IsString()
  chargeType: charge_type;

  @ApiProperty({
    description: 'Is the charge a fixed amount or a percentage',
    required: true,
    example: 'true',
  })
  @IsBoolean()
  isPercent: boolean = true;
}
