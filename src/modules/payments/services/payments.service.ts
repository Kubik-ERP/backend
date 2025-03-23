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

  async handleCallback(callbackData: any) {
    this.logger.log('Received Midtrans callback:', callbackData);

    const { order_id, status_code, transaction_status } = callbackData;

    if (transaction_status === 'settlement') {
      this.logger.log(`Payment for Order ${order_id} is SUCCESS`);
      return { success: true, message: 'Payment successful', order_id };
    } else if (transaction_status === 'pending') {
      this.logger.log(`Payment for Order ${order_id} is PENDING`);
      return { success: true, message: 'Payment pending', order_id };
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'expire'
    ) {
      this.logger.log(`Payment for Order ${order_id} is CANCELED/EXPIRED`);
      return {
        success: false,
        message: 'Payment canceled or expired',
        order_id,
      };
    } else {
      this.logger.warn(
        `Unknown payment status for Order ${order_id}: ${transaction_status}`,
      );
      return { success: false, message: 'Unknown payment status', order_id };
    }
  }
}
