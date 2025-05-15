import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// this callback got from Midtrans, then the field must be reflect the given field
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

export class PaymentCallbackCoreDto {
  @ApiProperty({ description: 'Acquirer of the payment', example: 'gopay' })
  @IsString()
  acquirer: string;

  @ApiProperty({ description: 'Currency of the payment', example: 'IDR' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Expiry time of the payment',
    example: '2025-05-15 13:43:44',
  })
  @IsString()
  expiry_time: string;

  @ApiProperty({
    description: 'Fraud status of the payment',
    example: 'accept',
  })
  @IsString()
  fraud_status: string;

  @ApiProperty({ description: 'Gross Amount of the payment', example: '50000' })
  @IsString()
  gross_amount: string;

  @ApiProperty({ description: 'Issuer of the payment', example: 'gopay' })
  @IsString()
  issuer: string;

  @ApiProperty({
    description: 'Merchant Id of the payment',
    example: 'G670501757',
  })
  @IsString()
  merchant_id: string;

  @ApiProperty({ description: 'Order Id of the payment', example: '0001' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Payment type', example: 'qris' })
  @IsString()
  payment_type: string;

  @ApiProperty({
    description: 'Settlement time of the payment',
    example: '2025-05-15 13:43:44',
  })
  @IsString()
  settlement_time: string;

  @ApiProperty({
    description: 'Signature Key of the payment',
    example: 'asf4a68svca6v3zv6av',
  })
  @IsString()
  signature_key: string;

  @ApiProperty({ description: 'Status code of the payment', example: '200' })
  @IsString()
  status_code: string;

  @ApiProperty({
    description: 'Status Message of the payment',
    example: 'midtrans payment notification',
  })
  @IsString()
  status_message: string;

  @ApiProperty({
    description: 'Transaction Id of the payment',
    example: '318db42f-c746-4adb-8337-3b505db445fe',
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    description: 'Transaction status of the payment',
    example: 'settlement',
  })
  @IsString()
  transaction_status: string;

  @ApiProperty({
    description: 'Transaction Time of the payment',
    example: '2025-05-15 13:43:44',
  })
  @IsString()
  transaction_time: string;

  @ApiProperty({
    description: 'Transaction Type of the payment',
    example: 'on-US',
  })
  @IsString()
  transaction_type: string;
}
