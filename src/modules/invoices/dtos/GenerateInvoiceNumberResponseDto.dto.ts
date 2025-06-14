import { ApiProperty } from '@nestjs/swagger';

export class GenerateInvoiceNumberResponseDto {
  @ApiProperty({
    example: '202506100001',
    description: 'Generated invoice number in the format yyyyMMdd00001',
  })
  invoiceNumber: string;
}
