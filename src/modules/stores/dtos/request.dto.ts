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
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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
  @MaxLength(45)
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
  @IsString()
  @MaxLength(255)
  streetAddress: string;

  @ApiProperty()
  @IsString()
  @MaxLength(45)
  city: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  building?: string;

  @Transform(({ value }) => {
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((obj) => {
            const isValid =
              obj &&
              typeof obj.day === 'string' &&
              typeof obj.openTime === 'string' &&
              typeof obj.closeTime === 'string';

            return isValid;
          });

          return filtered;
        }
      }
    } catch (err) {
      console.error('❗ Failed to parse businessHours:', err);
    }

    return [];
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  @ApiProperty({
    type: BusinessHoursDto,
    example: `[{"day":"Monday","openTime":"09:00:00","closeTime":"18:00:00"},{"day":"Tuesday","openTime":"10:00:00","closeTime":"19:00:00"}]`,
    description:
      'JSON string representing an array of business hours objects. Each object must have "day", "openTime", and "closeTime" in "HH:mm:ss" format.',
  })
  businessHours: BusinessHoursDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photo?: string;
}
