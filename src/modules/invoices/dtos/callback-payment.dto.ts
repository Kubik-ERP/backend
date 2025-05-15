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
  @ApiProperty({ description: 'Acquirer of the payment' })
  @IsString()
  acquirer: string;

  @ApiProperty({ description: 'Currency of the payment' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Expiry time of the payment' })
  @IsString()
  expiry_time: string;

  @ApiProperty({ description: 'Fraud status of the payment' })
  @IsString()
  fraud_status: string;

  @ApiProperty({ description: 'Gross Amount of the payment' })
  @IsString()
  gross_amount: string;

  @ApiProperty({ description: 'Issuer of the payment' })
  @IsString()
  issuer: string;

  @ApiProperty({ description: 'Merchant Id of the payment' })
  @IsString()
  merchant_id: string;

  @ApiProperty({ description: 'Order Id of the payment' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Payment type' })
  @IsString()
  payment_type: string;

  @ApiProperty({ description: 'Settlement time of the payment' })
  @IsString()
  settlement_time: string;

  @ApiProperty({ description: 'Signature Key of the payment' })
  @IsString()
  signature_key: string;

  @ApiProperty({ description: 'Status code of the payment' })
  @IsString()
  status_code: string;

  @ApiProperty({ description: 'Status Message of the payment' })
  @IsString()
  status_message: string;

  @ApiProperty({ description: 'Transaction Id of the payment' })
  @IsString()
  transaction_id: string;

  @ApiProperty({ description: 'Transaction status of the payment' })
  @IsString()
  transaction_status: string;

  @ApiProperty({ description: 'Transaction Time of the payment' })
  @IsString()
  transaction_time: string;

  @ApiProperty({ description: 'Transaction Type of the payment' })
  @IsString()
  transaction_type: string;
}
