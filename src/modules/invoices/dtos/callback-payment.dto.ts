import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentCallbackDto {
  @ApiProperty({ description: 'Order ID', required: true })
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Status Code', required: true })
  @IsNotEmpty()
  @IsString()
  status_code: string;

  @ApiProperty({ description: 'Transaction Status', required: true })
  @IsNotEmpty()
  @IsString()
  transaction_status: string;
}
