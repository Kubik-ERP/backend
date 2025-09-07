import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GenerateInvoiceNumberResponseDto {
  @ApiProperty({
    example: 'a4b53c4d-1f0e-4a7a-89bb-98b1522e1234',
    description: 'Store ID',
  })
  @IsUUID()
  storeId: string;
}
