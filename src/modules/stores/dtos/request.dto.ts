import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum BusinessType {
  RESTAURANT = 'Restaurant',
  RETAIL = 'Retail',
}

class BusinessHoursDto {
  @ApiProperty()
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
    {
      message: 'day must be a valid weekday in English',
    },
  )
  day: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'openTime must be in HH:mm:ss format (24-hour time)',
  })
  openTime?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'closeTime must be in HH:mm:ss format (24-hour time)',
  })
  closeTime?: string;
}

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  storeName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsPhoneNumber('ID')
  phoneNumber: string;

  @ApiProperty()
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiProperty()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty()
  @IsString()
  streetAddress: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({ type: BusinessHoursDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];
}
