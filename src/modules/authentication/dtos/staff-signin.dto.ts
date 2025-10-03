// Class Validator
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class StaffLoginDto {
  @ApiProperty({
    description: 'Staff email address',
    example: 'staff@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  public email: string;

  @ApiProperty({
    description: 'Device code (9 characters)',
    example: 'ABC123XYZ',
    minLength: 9,
    maxLength: 9,
  })
  @IsString({ message: 'Device code must be a string' })
  @IsNotEmpty({ message: 'Device code is required' })
  @Length(9, 9, { message: 'Device code must be exactly 9 characters' })
  public deviceCode: string;

  @ApiProperty({
    description: 'Remember me (30 days)',
    example: true,
  })
  @IsBoolean()
  public rememberMe: boolean = false;
}
