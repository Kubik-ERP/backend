import { IsEmail, IsEnum, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EmailTemplateType {
  RESET_PASSWORD = 'forgot-password',
  LOGIN_NOTIFICATION = 'login-notification',
  VERIFICATION_EMAIL = 'verification-email',
  REGISTER_SUMMARY = 'register-summary',
  RECEIVED_PO = 'received-po',
  RECEIPT = 'receipt',
}

export class SendTemplateEmailDto {
  @ApiProperty({
    enum: EmailTemplateType,
    description: 'Jenis template email yang akan dikirimkan',
    example: EmailTemplateType.RESET_PASSWORD,
  })
  @IsEnum(EmailTemplateType)
  template: EmailTemplateType;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Alamat email penerima',
  })
  @IsEmail()
  email_to: string;

  //   @ApiProperty({
  //     example: 'Reset Your Password',
  //     description: 'Subjek email',
  //   })
  //   @IsString()
  //   subject: string;
}
