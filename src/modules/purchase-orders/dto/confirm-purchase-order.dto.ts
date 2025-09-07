import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class ConfirmPurchaseOrderDto {
  @ApiProperty({
    description: 'Delivery date of the purchase order',
    example: '2025-08-10T00:00:00.000Z',
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  delivery_date: string;
}
