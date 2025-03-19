// Class Validator
import { IsEmail, IsNotEmpty } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  public email: string;
}
