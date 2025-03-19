// Class Transformer
import { Expose } from 'class-transformer';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class GenerateOtpEntity {
  @ApiProperty({ example: 123456, description: 'Generated OTP code' })
  @Expose()
  otp: string;

  constructor(otp: string) {
    this.otp = otp;
  }
}

export class VerifyOtpEntity {
  @ApiProperty()
  @Expose()
  isValid: boolean;

  constructor(isValid: boolean) {
    this.isValid = isValid;
  }
}
