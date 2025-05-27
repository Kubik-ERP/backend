// Class Validator
import { IsNotEmpty, IsString, IsEmail, Length } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'OTP code entered by user' })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4) // 4 digit OTP
  public otp: string;

  @ApiProperty({ description: 'User email', required: true })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  public email: string;

  @ApiProperty({ description: 'Verify Type', required: true })
  @IsNotEmpty()
  @IsString()
  public type: string;
}
