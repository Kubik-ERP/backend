import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelPurchaseOrderDto {
  @ApiProperty({
    description: 'Reason for cancelling the purchase order',
    example: 'Customer cancelled the order',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
