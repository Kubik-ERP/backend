import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PaymentFactory } from '../factories/payment.factory';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProcessPaymentDto,
  CalculationEstimationDto,
} from '../dtos/process-payment.dto';

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

  public async calculateTotal(
    request: CalculationEstimationDto,
  ): Promise<object> {
    let total = 0;

    for (const item of request.products) {
      const product = await this.prisma.products.findUnique({
        where: { id: item.productId },
        select: { price: true, discount_price: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      let finalPrice = product.discount_price ?? product.price ?? 0;

      if (item.variantId) {
        const variant = await this.prisma.variant.findUnique({
          where: { id: item.variantId },
          select: { price: true },
        });

        if (variant) {
          finalPrice += variant.price ?? 0;
        }

        const variantProduct =
          await this.prisma.variant_has_products.findUnique({
            where: {
              variant_id_products_id: {
                variant_id: item.variantId,
                products_id: item.productId,
              },
            },
            select: { additional_price: true },
          });

        if (variantProduct) {
          finalPrice += variantProduct.additional_price ?? 0;
        }
      }

      total += finalPrice * item.quantity;
    }

    const payment = {
      total: total,
    };

    return payment;
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
