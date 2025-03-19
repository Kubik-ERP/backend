// Class Validator
import { IsNotEmpty, IsEmail } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpDto {
  @ApiProperty({ description: 'User email', required: true })
  @IsNotEmpty()
  @IsEmail()
  public email: string;
}
