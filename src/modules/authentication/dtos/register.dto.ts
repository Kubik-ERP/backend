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
} from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedValue = (args.object as any)[args.constraints[0]];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must match ${args.constraints[0]}`;
        },
      },
    });
  };
}

export class RegisterEmailDto {
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

  @ApiProperty()
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
