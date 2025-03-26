import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PaymentFactory } from '../factories/payment.factory';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentFactory: PaymentFactory,
  ) {}

  public async processPayment(request: ProcessPaymentDto) {
    const paymentProvider = this.paymentFactory.getProvider(request.provider);
    if (!paymentProvider) {
      throw new NotFoundException(
        `Payment provider '${request.provider}' not found`,
      );
    }

    const amount = 0;

    const response = await paymentProvider.initiatePayment(
      request.orderId,
      amount,
    );

    return response;
  }

  public async verifyPayment(provider: string, paymentId: string) {
    const paymentProvider = this.paymentFactory.getProvider(provider);
    if (!paymentProvider) {
      throw new NotFoundException(`Payment provider '${provider}' not found`);
    }

    const response = await paymentProvider.verifyPayment(paymentId);

    return response;
  }

  public async handlePaymentCallback(
    order_id: string,
    status_code: string,
    transaction_status: string,
  ) {
    const paymentStatus = {
      orderId: order_id,
      statusCode: status_code,
      transactionStatus: transaction_status,
      message: this.getTransactionMessage(transaction_status),
    };

    // find invoice

    // update status

    return {
      success: true,
      message: `Payment status updated for order ${order_id}`,
      data: paymentStatus,
    };
  }

  public async findAllPaymentMethod() {
    return await this.prisma.payment_methods.findMany({
      orderBy: { sort_no: 'asc' },
    });
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
