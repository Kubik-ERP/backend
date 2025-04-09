// Factory
import { PaymentFactory } from '../factories/payment.factory';

// NestJS
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  invoice,
  invoice_details,
  invoicetype,
  paymenttype,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Service
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ProcessPaymentDto,
  CalculationEstimationDto,
} from '../dtos/process-payment.dto';
import { InvoiceDetailsEntity } from '../entities/invoice-details.dto';
import { CalculationResult } from '../interfaces/calculation.interface';

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

    // create invoice ID
    const invoiceId = uuidv4();
    const calculation = await this.calculateTotal(request);
    const invoiceData = {
      id: invoiceId,
      payment_methods_id: request.paymentMethodId,
      customer_id: request.customerId,
      table_code: request.tableCode,
      payment_status: invoicetype.unpaid,
      discount_amount: 0, // need to confirm
      subtotal: calculation.total,
      created_at: new Date(),
      update_at: new Date(),
      delete_at: null,
    };

    // create invoice with status unpaid
    await this.create(invoiceData);

    request.products.forEach(async (detail) => {
      // find the price
      let productPrice = 0,
        variantPrice = 0;
      const found = calculation.items.find(
        (p) =>
          p.productId === detail.productId && p.variantId === detail.variantId,
      );
      if (found) {
        productPrice = found.productPrice;
        variantPrice = found.variantPrice;
      }

      // create invoice detail ID
      const invoiceDetailId = uuidv4();
      const invoiceDetailData = {
        id: invoiceDetailId,
        invoice_id: invoiceId,
        product_name: detail.productId,
        product_price: productPrice + variantPrice,
        notes: detail.notes,
        order_type: request.orderType,
        qty: detail.quantity,
        product_variant: detail.variantId,
      };

      // create invoice with status unpaid
      await this.createInvoiceDetail(invoiceDetailData);
    });

    const response = await paymentProvider.initiatePayment(
      invoiceId,
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
    let status: invoicetype;
    switch (transaction_status) {
      case 'settlement':
        status = invoicetype.paid;
        break;
      case 'refund':
        status = invoicetype.refund;
        break;
      default:
        status = invoicetype.unpaid;
        break;
    }

    // find invoice
    const invoice = await this.findInvoiceId(order_id);
    if (invoice === null) {
      throw new NotFoundException(`Invoice '${order_id}' not found`);
    }

    // update status
    const updateInvoice = await this.updateStatusById(order_id, status);
    if (updateInvoice === null) {
      throw new NotFoundException(`Invoice '${order_id}' not found`);
    }

    const paymentStatus = {
      orderId: order_id,
      statusCode: status_code,
      transactionStatus: status,
      message: this.getTransactionMessage(status),
    };

    return {
      success: true,
      message: `Payment status updated for order ${order_id}`,
      data: paymentStatus,
    };
  }

  public async calculateTotal(
    request: CalculationEstimationDto,
  ): Promise<CalculationResult> {
    let total = 0;
    const items = [];

    for (const item of request.products) {
      const product = await this._prisma.products.findUnique({
        where: { id: item.productId },
        select: { price: true, discount_price: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const productPrice = product.discount_price ?? product.price ?? 0;
      let variantPrice = 0;

      if (item.variantId) {
        const variant = await this._prisma.variant.findUnique({
          where: { id: item.variantId },
          select: { price: true },
        });

        if (variant) {
          variantPrice += variant.price ?? 0;
        }

        const variantProduct =
          await this._prisma.variant_has_products.findUnique({
            where: {
              variant_id_products_id: {
                variant_id: item.variantId,
                products_id: item.productId,
              },
            },
            select: { products_id: true, variant_id: true },
          });

        if (!variantProduct) {
          throw new Error(
            `Product ${item.productId} with Variant ${item.variantId} not found`,
          );
        }
      }

      const subtotal = (productPrice + variantPrice) * item.quantity;
      total += subtotal;

      items.push({
        productId: item.productId,
        variantId: item.variantId,
        productPrice,
        variantPrice,
        qty: item.quantity,
        subtotal,
      });
    }

    return {
      total,
      items,
    };
  }

  /**
   * @description Find all payment method
   */
  public async findAllPaymentMethod() {
    return await this._prisma.payment_methods.findMany({
      orderBy: { sort_no: 'asc' },
    });
  }

  /**
   * @description Find invoice by ID
   */
  public async findInvoiceId(id: string): Promise<invoice> {
    const invoice = await this._prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found.`);
    }

    return invoice;
  }

  /**
   * @description Update a invoice status
   */
  public async updateStatusById(
    id: string,
    status: invoicetype,
  ): Promise<invoice> {
    try {
      return await this._prisma.invoice.update({
        where: { id },
        data: { payment_status: status },
      });
    } catch (error) {
      throw new BadRequestException('Failed to update invoice status', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Create an invoice
   */
  public async create(invoice: invoice): Promise<invoice> {
    try {
      return await this._prisma.invoice.create({
        data: {
          id: invoice.id ?? uuidv4(),
          payment_methods_id: invoice.payment_methods_id,
          customer_id: invoice.customer_id,
          table_code: invoice.table_code,
          payment_status: invoice.payment_status as invoicetype,
          discount_amount: invoice.discount_amount,
          subtotal: invoice.subtotal,
          created_at: invoice.created_at ?? new Date(),
          update_at: invoice.update_at ?? new Date(),
          delete_at: invoice.delete_at ?? null,
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
    invoiceDetail: invoice_details,
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
