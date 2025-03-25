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

enum BusinessType {
  RESTAURANT = 'Restaurant',
  RETAIL = 'Retail',
}

class BusinessHoursDto {
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

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'openTime must be in HH:mm:ss format (24-hour time)',
  })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'closeTime must be in HH:mm:ss format (24-hour time)',
  })
  closeTime?: string;
}

export class CreateStoreDto {
  @IsString()
  storeName: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber('ID')
  phoneNumber: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsString()
  streetAddress: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];
}
