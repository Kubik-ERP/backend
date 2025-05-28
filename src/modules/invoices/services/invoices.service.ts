// Factory
import { PaymentFactory } from '../factories/payment.factory';

// NestJS
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { invoice, invoice_details, invoice_type, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Service
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CalculationEstimationDto,
  ProceedCheckoutInvoiceDto,
  ProceedInstantPaymentDto,
  ProceedPaymentDto,
  ProductDto,
} from '../dtos/process-payment.dto';
import { CalculationResult } from '../interfaces/calculation.interface';
import { PaymentGateway } from '../interfaces/payments.interface';
import { PaymentCallbackCoreDto } from '../dtos/callback-payment.dto';
import { GetInvoiceDto, GetListInvoiceDto } from '../dtos/invoice.dto';
import { NotificationHelper } from 'src/common/helpers/notification.helper';
import { request } from 'http';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _paymentFactory: PaymentFactory,
    private readonly _notificationHelper: NotificationHelper,
  ) {}

  public async getInvoices(request: GetListInvoiceDto) {
    const {
      page,
      pageSize,
      createdAtFrom,
      createdAtTo,
      // orderType,
      paymentStatus,
    } = request;

    const filters: Prisma.invoiceWhereInput = {
      created_at: {
        gte: new Date(createdAtFrom),
        lte: new Date(createdAtTo),
      },
      // order_type: { // TODO: Check again the order type should in invoice table
      //   equals: orderType,
      // },
      payment_status: {
        equals: paymentStatus,
      },
    };

    const [data, total] = await Promise.all([
      this._prisma.invoice.findMany({
        where: filters,
        include: {
          customer: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          created_at: 'desc',
        },
      }),
      this._prisma.invoice.count({
        where: filters,
      }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  public async getInvoicePreview(request: GetInvoiceDto) {
    const invoice = await this._prisma.invoice.findUnique({
      where: { id: request.invoiceId },
      include: {
        customer: true,
        invoice_details: {
          include: {
            products: true,
            variant: true,
          },
        },
        payment_methods: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with ID ${request.invoiceId} not found.`,
      );
    }

    return invoice;
  }

  public async proceedInstantPayment(request: ProceedInstantPaymentDto) {
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
      payment_status: invoice_type.unpaid,
      discount_amount: 0, // need to confirm
      order_type: request.orderType,
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
        product_id: detail.productId,
        product_price: productPrice,
        notes: detail.notes,
        order_type: request.orderType,
        qty: detail.quantity,
        variant_id: detail.variantId,
        variant_price: variantPrice,
      };

      // create invoice with status unpaid
      await this.createInvoiceDetail(invoiceDetailData);
    });

    const response = await this.initiatePaymentBasedOnMethod(
      request.paymentMethodId,
      paymentProvider,
      invoiceId,
      calculation.total,
    );

    return response;
  }

  public async proceedCheckout(request: ProceedCheckoutInvoiceDto) {
    // create invoice ID
    const invoiceId = uuidv4();
    const calculation = await this.calculateTotal(request);
    const invoiceData = {
      id: invoiceId,
      payment_methods_id: null,
      customer_id: request.customerId,
      table_code: request.tableCode,
      payment_status: invoice_type.unpaid,
      discount_amount: 0, // need to confirm
      order_type: request.orderType,
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
        product_id: detail.productId,
        product_price: productPrice,
        notes: detail.notes,
        order_type: request.orderType,
        qty: detail.quantity,
        variant_id: detail.variantId,
        variant_price: variantPrice,
      };

      // create invoice with status unpaid
      await this.createInvoiceDetail(invoiceDetailData);
    });

    const result = {
      orderId: invoiceId,
    };
    return result;
  }

  public async proceedPayment(request: ProceedPaymentDto) {
    // Check the invoice is unpaid
    const invoice = await this.findInvoiceId(request.invoiceId);
    if (invoice.payment_status !== invoice_type.unpaid) {
      throw new BadRequestException(`Invoice status is not unpaid`);
    }

    // define payment method and provider
    const paymentProvider = this._paymentFactory.getProvider(request.provider);
    if (!paymentProvider) {
      throw new NotFoundException(
        `Payment provider '${request.provider}' not found`,
      );
    }

    // calculate the total
    const invoiceDetails = await this.getInvoiceDetailForCalculationByInvoiceId(
      request.invoiceId,
    );

    // check if invoice detail is empty
    if (invoiceDetails.length < 1) {
      throw new BadRequestException(`Invoice detail not found`);
    }

    // re-map the struct
    const calculationEstimationDto = new CalculationEstimationDto();
    calculationEstimationDto.products = [];
    for (const item of invoiceDetails) {
      const dto = new ProductDto();
      dto.productId = item.product_id ?? '';
      dto.variantId = item.variant_id ?? '';
      dto.quantity = item.qty ?? 0;

      calculationEstimationDto.products.push(dto);
    }

    const calculation = await this.calculateTotal(calculationEstimationDto);
    const response = await this.initiatePaymentBasedOnMethod(
      request.paymentMethodId,
      paymentProvider,
      request.invoiceId,
      calculation.total,
    );

    return response;
  }

  public async handlePaymentCallback(
    order_id: string,
    status_code: string,
    transaction_status: string,
  ) {
    let status: invoice_type;
    switch (transaction_status) {
      case 'settlement':
        status = invoice_type.paid;
        break;
      case 'refund':
        status = invoice_type.refund;
        break;
      default:
        status = invoice_type.unpaid;
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

  public async handlePaymentCoreCallback(
    requestCallback: PaymentCallbackCoreDto,
  ) {
    // checking status code
    if (requestCallback.status_code != '200') {
      this._notificationHelper.notifyPaymentFailed(requestCallback.order_id);
      throw new BadRequestException(`Request is failed`);
    }

    // checking fraud status
    if (requestCallback.fraud_status != 'accept') {
      this._notificationHelper.notifyPaymentFailed(requestCallback.order_id);
      throw new BadRequestException(`Fraud transaction detected`);
    }

    let status: invoice_type;
    switch (requestCallback.transaction_status) {
      case 'settlement':
        status = invoice_type.paid;
        break;
      case 'pending':
        status = invoice_type.refund;
        break;
      default:
        status = invoice_type.unpaid;
        break;
    }

    // find invoice
    const invoice = await this.findInvoiceId(requestCallback.order_id);
    if (invoice === null) {
      throw new NotFoundException(
        `Invoice '${requestCallback.order_id}' not found`,
      );
    }

    // update status
    const updateInvoice = await this.updateStatusById(
      requestCallback.order_id,
      status,
    );
    if (updateInvoice === null) {
      throw new NotFoundException(
        `Invoice '${requestCallback.order_id}' not found`,
      );
    }

    const paymentStatus = {
      orderId: requestCallback.order_id,
      statusCode: requestCallback.status_code,
      transactionStatus: status,
      message: this.getTransactionMessage(status),
    };

    // notify the FE
    this._notificationHelper.notifyPaymentSuccess(requestCallback.order_id);

    return {
      success: true,
      message: `Payment status updated for order ${requestCallback.order_id}`,
      data: paymentStatus,
    };
  }

  public async calculateTotal(
    request: CalculationEstimationDto,
  ): Promise<CalculationResult> {
    let total = 0;
    let discountTotal = 0;
    const items = [];

    for (const item of request.products) {
      const product = await this._prisma.products.findUnique({
        where: { id: item.productId },
        select: { price: true, discount_price: true },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      const originalPrice = product.price ?? 0;
      const discountedPrice =
        product.discount_price !== null && product.discount_price > 0
          ? product.discount_price
          : originalPrice;
      const productPrice = discountedPrice;
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

      const discountAmount = (originalPrice - discountedPrice) * item.quantity;
      const subtotal = (productPrice + variantPrice) * item.quantity;
      discountTotal += discountAmount;
      total += subtotal;

      items.push({
        productId: item.productId,
        variantId: item.variantId,
        productPrice,
        variantPrice,
        qty: item.quantity,
        discountAmount: discountAmount,
        subtotal,
      });
    }

    return {
      total,
      discountTotal,
      items,
    };
  }

  // Private function section
  private async initiatePaymentBasedOnMethod(
    methodId: string,
    provider: PaymentGateway,
    orderId: string,
    amount: number,
  ): Promise<any> {
    // find payment method
    const paymentMethod = await this._prisma.payment_methods.findUnique({
      where: { id: methodId },
    });

    switch (paymentMethod?.name) {
      case 'Snap':
        return await provider.initiatePaymentSnap(orderId, amount);
      case 'Qris':
        return await provider.initiatePaymentCoreQris(orderId, amount);
      default:
        throw new BadRequestException(
          `Unsupported payment method: ${methodId}`,
        );
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

  // End of private function

  // Query section
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
    status: invoice_type,
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
          id: invoice.id,
          payment_methods_id: invoice.payment_methods_id,
          customer_id: invoice.customer_id,
          table_code: invoice.table_code,
          payment_status: invoice.payment_status as invoice_type,
          discount_amount: invoice.discount_amount,
          subtotal: invoice.subtotal,
          order_type: invoice.order_type,
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
          product_id: invoiceDetail.product_id,
          product_price: invoiceDetail.product_price,
          notes: invoiceDetail.notes,
          qty: invoiceDetail.qty,
          variant_id: invoiceDetail.variant_id,
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
   * @description Get invoice detail data
   */
  public async getInvoiceDetailForCalculationByInvoiceId(invoiceId: string) {
    try {
      return await this._prisma.invoice_details.findMany({
        where: { invoice_id: invoiceId },
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to fetch invoice detail', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  // End of query section
}
