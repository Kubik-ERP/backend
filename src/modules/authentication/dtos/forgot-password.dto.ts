// Class Validator
import { IsEmail, IsNotEmpty } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { Match } from 'src/common/helpers/validators.helper';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  public email: string;
}

export class ForgotPasswordResetDto {
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
  public token: string;
}
