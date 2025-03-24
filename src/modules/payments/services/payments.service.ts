import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PaymentFactory } from '../factories/payment.factory';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly paymentFactory: PaymentFactory) {}

  async processPayment(provider: string, orderId: string, amount: number) {
    const paymentProvider = this.paymentFactory.getProvider(provider);
    if (!paymentProvider) {
      throw new NotFoundException(`Payment provider '${provider}' not found`);
    }

    const response = await paymentProvider.initiatePayment(orderId, amount);

    return response;
  }

  async verifyPayment(provider: string, paymentId: string) {
    const paymentProvider = this.paymentFactory.getProvider(provider);
    if (!paymentProvider) {
      throw new NotFoundException(`Payment provider '${provider}' not found`);
    }

    const response = await paymentProvider.verifyPayment(paymentId);

    return response;
  }

  async handlePaymentCallback(callbackData: any) {
    this.logger.log('Received Midtrans callback:', callbackData);

    const { order_id, status_code, transaction_status } = callbackData;

    const paymentStatus = {
      orderId: order_id,
      statusCode: status_code,
      transactionStatus: transaction_status,
      message: this.getTransactionMessage(transaction_status),
    };

    // TODO: Implemetation store to database

    return {
      success: true,
      message: `Payment status updated for order ${order_id}`,
      data: paymentStatus,
    };
  }

  private getTransactionMessage(status: string): string {
    switch (status) {
      case 'settlement':
        return 'Payment completed successfully';
      case 'pending':
        return 'Payment is pending';
      case 'deny':
        return 'Payment was denied';
      case 'expire':
        return 'Payment expired';
      case 'cancel':
        return 'Payment was canceled';
      default:
        return 'Unknown payment status';
    }
  }
}
