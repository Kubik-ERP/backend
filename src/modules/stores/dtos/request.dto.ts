import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum BusinessType {
  RESTAURANT = 'Restaurant',
  RETAIL = 'Retail',
}

class BusinessHoursDto {
  @ApiProperty({ example: 'Monday' })
  @IsString()
  @IsIn(
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    { message: 'day must be a valid weekday in English' },
  )
  day: string;

  @ApiProperty({ example: '09:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'openTime must be in HH:mm:ss format (24-hour time)',
  })
  openTime?: string;

  @ApiProperty({ example: '18:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'closeTime must be in HH:mm:ss format (24-hour time)',
  })
  closeTime?: string;
}

export class CreateStoreDto {
  @ApiProperty({ example: 'My Store' })
  @IsString()
  @MaxLength(45)
  storeName: string;

  @ApiProperty({ example: 'my@store.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+628123456789' })
  @IsPhoneNumber('ID')
  phoneNumber: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiProperty({ example: 'Jl. Kemerdekaan 10' })
  @IsString()
  @MaxLength(255)
  streetAddress: string;

  @ApiProperty({ example: 'Surabaya' })
  @IsString()
  @MaxLength(45)
  city: string;

  @ApiProperty({ example: '60236', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiProperty({ example: 'Ruko Blok B', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  building?: string;

  @ApiProperty({
    type: [BusinessHoursDto],
    description:
      'businessHour[0][day], businessHour[0][openTime], businessHour[0][closeTime]',
  })
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];

  @ApiProperty({
    required: false,
    description: 'Relative image path (optional)',
  })
  @IsOptional()
  @IsString()
  photo?: string;
}
