// Entity
import { InvoiceEntity } from '../entities/invoices.entity';

// Factory
import { PaymentFactory } from '../factories/payment.factory';

// NestJS
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { invoice, invoice_details } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Service
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProcessPaymentDto,
  CalculationEstimationDto,
} from '../dtos/process-payment.dto';
import { InvoiceDetailsEntity } from '../entities/invoice-details.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _paymentFactory: PaymentFactory,
  ) {}

  public async processPayment(request: ProcessPaymentDto) {
    const paymentProvider = this._paymentFactory.getProvider(request.provider);
    if (!paymentProvider) {
      throw new NotFoundException(
        `Payment provider '${request.provider}' not found`,
      );
    }

    // create order ID
    const orderId = uuidv4();

    // create invoice with status
    // const a = await this.create({
    //   email: email,
    //   phone: parseInt(phoneNumber.toString()).toString(),
    //   ext: parseInt(phoneCountryCode.toString()),
    //   password: passwordHashed,
    // });

    const calculation = await this.calculateTotal(request);
    const response = await paymentProvider.initiatePayment(
      orderId,
      calculation.total,
    );

    return response;
  }

  public async verifyPayment(provider: string, paymentId: string) {
    const paymentProvider = this._paymentFactory.getProvider(provider);
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
  ): Promise<{ total: number }> {
    let total = 0;

    for (const item of request.products) {
      const product = await this._prisma.products.findUnique({
        where: { id: item.productId },
        select: { price: true, discount_price: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      let finalPrice = product.discount_price ?? product.price ?? 0;

      if (item.variantId) {
        const variant = await this._prisma.variant.findUnique({
          where: { id: item.variantId },
          select: { price: true },
        });

        if (variant) {
          finalPrice += variant.price ?? 0;
        }

        const variantProduct =
          await this._prisma.variant_has_products.findUnique({
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
    return await this._prisma.payment_methods.findMany({
      orderBy: { sort_no: 'asc' },
    });
  }

  /**
   * @description Create an invoice
   */
  public async create(invoice: InvoiceEntity): Promise<invoice> {
    try {
      return await this._prisma.invoice.create({
        data: {
          id: invoice.id,
          payment_methods_id: invoice.payment_methods_id,
          customer_id: invoice.customer_id,
          discount_amount: invoice.discount_amount,
          table_code: invoice.table_code,
          payment_status: invoice.payment_status,
        },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to create invoice', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Create an invoice details
   */
  public async createInvoiceDetail(
    invoiceDetail: InvoiceDetailsEntity,
  ): Promise<invoice_details> {
    try {
      return await this._prisma.invoice_details.create({
        data: {
          id: invoiceDetail.id,
          invoice_id: invoiceDetail.invoice_id,
          product_name: invoiceDetail.product_name,
          product_price: invoiceDetail.product_price,
          notes: invoiceDetail.notes,
          order_type: invoiceDetail.order_type,
          qty: invoiceDetail.qty,
          product_variant: invoiceDetail.product_variant,
        },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to create invoice', {
        cause: new Error(),
        description: error.message,
      });
    }
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
