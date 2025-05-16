// Class Validator
import {
  registerDecorator,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidationOptions,
  ValidationArguments,
  MinLength,
  Matches,
  IsNumber,
  Length,
} from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Match } from 'src/common/helpers/validators.helper';

export class RegisterEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  public fullName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  public email: string;

  @ApiProperty()
  @IsNotEmpty()
  public password: string;

  @ApiProperty()
  @IsNotEmpty()
  @Match('password', {
    message: 'Password confirmation does not match password',
  })
  public passwordConfirmation: string;

  @ApiProperty({ example: '62', description: 'Country code' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'Phone country code must be a number (even as a string)',
  })
  public phoneCountryCode: string | number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'Phone number must be a number (even as a string)',
  })
  @MinLength(7)
  @MaxLength(14)
  public phoneNumber: string | number;
}
