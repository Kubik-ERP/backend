// Class Validator
import { IsNotEmpty, IsEmail } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class SentEmailInvoiceByIdDto {
  @ApiProperty({
    description: 'User email',
    required: true,
    example: 'email@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  public email: string;

  @ApiProperty({
    description: 'Invoice ID',
    required: true,
    example: '01970571-bd68-7dfd-ba41-00aa890cc3db',
  })
  @IsNotEmpty()
  public invoiceId: string;
}
