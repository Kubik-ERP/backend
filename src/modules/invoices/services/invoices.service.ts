// Factory
import { PaymentFactory } from '../factories/payment.factory';
import { generateInvoiceHtmlPdf } from '../../../common/helpers/invoice-html-pdf.helper';

// NestJS
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  charge_type,
  invoice,
  invoice_charges,
  invoice_details,
  invoice_type,
  order_type,
  Prisma,
} from '@prisma/client';
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
import { ChargesService } from 'src/modules/charges/services/charges.service';
import { nodeModuleNameResolver } from 'typescript';
import { MailService } from 'src/modules/mail/services/mail.service';
import { SentEmailInvoiceByIdDto } from '../dtos/sent-email.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _charge: ChargesService,
    private readonly _paymentFactory: PaymentFactory,
    private readonly _notificationHelper: NotificationHelper,
    private readonly _mailService: MailService,
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
      this.logger.error(`Invoice with ID ${request.invoiceId} not found.`);
      throw new NotFoundException(
        `Invoice with ID ${request.invoiceId} not found.`,
      );
    }

    return invoice;
  }

  public async sentEmailInvoiceById(invoiceId: string): Promise<any> {
    // Find the invoice by id
    const invoice = await this.getInvoicePreview({ invoiceId });

    // Ambil email dari customer invoice
    const email = invoice.customer?.email;

    if (!email) {
      throw new Error('Customer email not found');
    }

    const pdfBuffer = await generateInvoiceHtmlPdf(invoice);

    // Ensure created_at is not null and is a string or Date
    const safeInvoice = {
      ...invoice,
      created_at: invoice.created_at ?? new Date(),
      name: invoice.customer?.name ?? 'Unknown Customer',
    };

    await this._mailService.sendEmailInvoiceById(
      email,
      safeInvoice,
      invoiceId,
      pdfBuffer,
    );
    return {
      success: true,
      message: `Email sent successfully to ${email}`,
    };
  }

  public async proceedInstantPayment(request: ProceedInstantPaymentDto) {
    const paymentProvider = this._paymentFactory.getProvider(request.provider);
    if (!paymentProvider) {
      this.logger.error(`Payment provider '${request.provider}' not found`);
      throw new NotFoundException(
        `Payment provider '${request.provider}' not found`,
      );
    }

    // create invoice ID
    const invoiceId = uuidv4();
    const invoiceData = {
      id: invoiceId,
      payment_methods_id: request.paymentMethodId,
      customer_id: request.customerId,
      table_code: request.tableCode,
      payment_status: invoice_type.unpaid,
      discount_amount: 0, // need to confirm
      order_type: request.orderType,
      subtotal: 0, // default value
      created_at: new Date(),
      update_at: new Date(),
      delete_at: null,
      paid_at: null,
    };

    // create invoice with status unpaid
    await this.create(invoiceData);

    const calculation = await this.calculateTotal(request, invoiceId);

    // update subtotal
    await this.update(invoiceId, calculation.total);

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

      // validate product has variant
      const validVariantId = await this.validateProductVariant(
        detail.productId,
        detail.variantId,
      );

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
        variant_id: validVariantId,
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
      paid_at: null,
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
      this.logger.error(`Invoice status is not unpaid`);
      throw new BadRequestException(`Invoice status is not unpaid`);
    }

    // define payment method and provider
    const paymentProvider = this._paymentFactory.getProvider(request.provider);
    if (!paymentProvider) {
      this.logger.error(`Payment provider '${request.provider}' not found`);
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
      this.logger.error(`Invoice detail not found`);
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

    // calculate estimation
    const calculation = await this.calculateTotal(
      calculationEstimationDto,
      invoice.id,
    );
    const response = await this.initiatePaymentBasedOnMethod(
      request.paymentMethodId,
      paymentProvider,
      request.invoiceId,
      calculation.grandTotal,
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
      this.logger.error(`Invoice '${order_id}' not found`);
      throw new NotFoundException(`Invoice '${order_id}' not found`);
    }

    // update status
    const updateInvoice = await this.updateStatusById(order_id, status);
    if (updateInvoice === null) {
      this.logger.error(`Invoice '${order_id}' not found`);
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
      this.logger.error(`Request is failed`);
      throw new BadRequestException(`Request is failed`);
    }

    // checking fraud status
    if (requestCallback.fraud_status != 'accept') {
      this._notificationHelper.notifyPaymentFailed(requestCallback.order_id);
      this.logger.error(`Fraud transaction detected`);
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
      this.logger.error(`Invoice '${requestCallback.order_id}' not found`);
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
      this.logger.error(`Invoice '${requestCallback.order_id}' not found`);
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
    this.logger.error(`Invoice '${requestCallback.order_id}' success`);
    this._notificationHelper.notifyPaymentSuccess(requestCallback.order_id);

    return {
      success: true,
      message: `Payment status updated for order ${requestCallback.order_id}`,
      data: paymentStatus,
    };
  }

  public async calculateTotal(
    request: CalculationEstimationDto,
    invoiceId?: string,
  ): Promise<CalculationResult> {
    let total = 0;
    let discountTotal = 0;
    let taxAmount = 0;
    let taxType = false;
    let serviceAmount = 0;
    let serviceType = false;
    const items = [];

    for (const item of request.products) {
      const product = await this._prisma.products.findUnique({
        where: { id: item.productId },
        select: { price: true, discount_price: true },
      });

      if (!product) {
        this.logger.error(`Product with ID ${item.productId} not found`);
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      // using the discounted price to proceed calculation
      const originalPrice = product.price ?? 0;
      const discountedPrice =
        product.discount_price !== null && product.discount_price > 0
          ? product.discount_price
          : originalPrice;
      const productPrice = discountedPrice;
      let variantPrice = 0;

      const validVariantId = await this.validateProductVariant(
        item.productId,
        item.variantId,
      );

      if (validVariantId) {
        const variant = await this._prisma.variant.findUnique({
          where: { id: validVariantId },
          select: { price: true },
        });

        if (variant) {
          variantPrice = variant.price ?? 0;
        } else {
          this.logger.warn(
            `Variant with ID ${validVariantId} not found, skipping variant price`,
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

    // applied tax and service
    // bacause tax and service only set one term, this part
    // might be need to be change if the business change
    // get service
    let grandTotal = total;
    const serviceCharge = await this._charge.getChargeByType(
      charge_type.service,
    );
    const isTakeaway = request.orderType === order_type.take_away;

    if (serviceCharge?.is_enabled) {
      const serviceApplicable = serviceCharge.applied_to_takeaway
        ? true
        : !isTakeaway;

      if (serviceApplicable) {
        const percentage = Number(serviceCharge.percentage);
        if (serviceCharge.is_include) {
          // If service include, means has include total
          serviceAmount = total - total / (1 + percentage);
        } else {
          // If service exclude, count service as an additional
          serviceAmount = total * percentage;
          grandTotal += serviceAmount;
        }

        serviceType = serviceCharge.is_include;

        // upsert data service charge into invoice charge
        if (invoiceId !== null && invoiceId !== undefined) {
          const invoiceCharge = {
            invoice_id: invoiceId!,
            charge_id: serviceCharge.id,
            percentage: serviceCharge.percentage,
            amount: new Prisma.Decimal(serviceAmount),
            is_include: serviceType,
          };
          await this.upsertInvoiceCharge(invoiceCharge);
        }
      }
    }

    // get tax
    const tax = await this._charge.getChargeByType(charge_type.tax);
    if (tax?.is_enabled) {
      const taxApplicable = tax.applied_to_takeaway ? true : !isTakeaway;
      const percentage = Number(tax.percentage);

      if (taxApplicable) {
        // Base tax counting
        let taxBase = total;

        // If service charge exclude, then tax counted as total + service
        if (!serviceType) {
          taxBase += serviceAmount;
        }

        if (tax.is_include) {
          // If tax include, count tax portion has included in taxBase
          taxAmount = taxBase - taxBase / (1 + percentage);
        } else {
          // If tax exclude, tax counted as additional
          taxAmount = taxBase * percentage;
          grandTotal += taxAmount;
        }

        taxType = tax.is_include;

        // upsert data service charge into invoice charge
        if (invoiceId !== null && invoiceId !== undefined) {
          const invoiceCharge = {
            invoice_id: invoiceId!,
            charge_id: tax.id,
            percentage: tax.percentage,
            amount: new Prisma.Decimal(taxAmount),
            is_include: taxType,
          };
          await this.upsertInvoiceCharge(invoiceCharge);
        }
      }
    }

    return {
      total,
      discountTotal,
      tax: taxAmount,
      taxInclude: taxType,
      serviceCharge: serviceAmount,
      serviceChargeInclude: serviceType,
      grandTotal,
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
        this.logger.error(`Unsupported payment method: ${methodId}`);
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

  private async validateProductVariant(
    productId: string,
    variantId?: string,
  ): Promise<string | null> {
    const hasVariant = await this._prisma.variant_has_products.findFirst({
      where: { products_id: productId },
      select: { variant_id: true },
    });

    if (hasVariant && !variantId) {
      this.logger.error(
        `Product ${productId} requires a variant but none was provided`,
      );
      throw new Error(`Product ${productId} requires a variant`);
    }

    if (!hasVariant && variantId) {
      this.logger.warn(
        `Product ${productId} does not support variants, but variant ${variantId} was provided. Ignoring variant.`,
      );
      throw new BadRequestException(
        `Product ${productId} does not support variants, but variant ${variantId} was provided. Ignoring variant.`,
      );
    }

    return variantId ?? null;
  }

  private async upsertInvoiceCharge(request: invoice_charges) {
    // update insert data of invoice charge
    const invoiceCharge = await this.getInvoiceChargeById(
      request.invoice_id,
      request.charge_id,
    );
    if (invoiceCharge == null) {
      // if tax or service not exist create
      const invoiceChargeData = {
        invoice_id: request.invoice_id,
        charge_id: request.charge_id,
        percentage: request.percentage,
        amount: request.amount,
        is_include: request.is_include,
      };

      return await this.createInvoiceCharge(invoiceChargeData);
    } else {
      // if tax or service exist update
      invoiceCharge.percentage = request.percentage;
      invoiceCharge.amount = request.amount;

      await this.updateInvoiceCharge(invoiceCharge);
      return invoiceCharge;
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
      this.logger.error(`Invoice with ID ${id} not found.`);
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
        data: { payment_status: status, paid_at: new Date() },
      });
    } catch (error) {
      this.logger.error('Failed to update invoice status');
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
          paid_at: invoice.paid_at ?? null,
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to create invoice');
      throw new BadRequestException('Failed to create invoice', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async update(invoiceId: string, total: number) {
    try {
      await this._prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: total,
          update_at: new Date(),
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to update invoice');
      throw new BadRequestException('Failed to update invoice', {
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
          variant_id:
            invoiceDetail.variant_id === '' ? null : invoiceDetail.variant_id,
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to create invoice detail');
      throw new BadRequestException('Failed to create invoice detail', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Create an invoice charge
   */
  public async createInvoiceCharge(
    invoiceCharge: invoice_charges,
  ): Promise<invoice_charges> {
    try {
      return await this._prisma.invoice_charges.create({
        data: {
          invoice_id: invoiceCharge.invoice_id,
          charge_id: invoiceCharge.charge_id,
          percentage: invoiceCharge.percentage,
          amount: invoiceCharge.amount,
          is_include: invoiceCharge.is_include,
        },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to create invoice charge');
      throw new BadRequestException('Failed to create invoice charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Update a charge by type
   */
  public async updateInvoiceCharge(
    invoiceCharge: invoice_charges,
  ): Promise<number> {
    try {
      const result = await this._prisma.invoice_charges.updateMany({
        where: {
          invoice_id: invoiceCharge.charge_id,
          charge_id: invoiceCharge.charge_id,
        },
        data: {
          percentage: invoiceCharge.percentage,
          amount: invoiceCharge.amount,
        },
      });
      return result.count;
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to update invoice charge');
      throw new BadRequestException('Failed to update invoice charge', {
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
      this.logger.error('Failed to fetch invoice detail');
      throw new BadRequestException('Failed to fetch invoice detail', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get invoice charge data
   */
  public async getInvoiceChargeById(invoiceId: string, chargeId: string) {
    try {
      return await this._prisma.invoice_charges.findFirst({
        where: { invoice_id: invoiceId, charge_id: chargeId },
      });
    } catch (error) {
      console.log(error);
      this.logger.error('Failed to fetch invoice charge');
      throw new BadRequestException('Failed to fetch invoice charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  // End of query section
}
