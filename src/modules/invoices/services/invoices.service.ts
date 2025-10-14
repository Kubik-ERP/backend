// Factory
import { generateInvoiceHtmlPdf } from '../../../common/helpers/invoice-html-pdf.helper';
import { PaymentFactory } from '../factories/payment.factory';

// NestJS
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  cash_drawer_type,
  charge_type,
  invoice,
  invoice_charges,
  invoice_details,
  invoice_type,
  order_status,
  order_type,
  payment_type,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Service
import { NotificationHelper } from 'src/common/helpers/notification.helper';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { validateStoreId } from 'src/common/helpers/validators.helper';
import { CashDrawerService } from 'src/modules/cash-drawer/services/cash-drawer.service';
import { ChargesService } from 'src/modules/charges/services/charges.service';
import { KitchenQueueAdd } from 'src/modules/kitchen/dtos/queue.dto';
import { KitchenService } from 'src/modules/kitchen/services/kitchen.service';
import { MailService } from 'src/modules/mail/services/mail.service';
import { VouchersService } from 'src/modules/vouchers/vouchers.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from '../../products/products.service';
import { VariantsService } from '../../variants/variants.service';
import { PaymentCallbackCoreDto } from '../dtos/callback-payment.dto';
import {
  GetInvoiceDto,
  GetListInvoiceDto,
  InvoiceUpdateDto,
  UpdateInvoiceOrderStatusDto,
} from '../dtos/invoice.dto';
import {
  CalculationEstimationDto,
  ProceedCheckoutInvoiceDto,
  ProceedInstantPaymentDto,
  ProceedPaymentDto,
  ProductDto,
  RedeemLoyaltyDto,
  UpsertInvoiceItemDto,
} from '../dtos/process-payment.dto';
import {
  GetInvoiceSettingDto,
  SettingInvoiceDto,
} from '../dtos/setting-invoice.dto';
import { CalculationResult } from '../interfaces/calculation.interface';
import { PaymentGateway } from '../interfaces/payments.interface';
import e from 'express';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _cashDrawer: CashDrawerService,
    private readonly _charge: ChargesService,
    private readonly _kitchenQueue: KitchenService,
    private readonly _paymentFactory: PaymentFactory,
    private readonly _notificationHelper: NotificationHelper,
    private readonly _mailService: MailService,
    private readonly _variantService: VariantsService,
    private readonly _productService: ProductsService,
    private readonly _voucherService: VouchersService,
  ) {}

  public async getInvoices(
    header: ICustomRequestHeaders,
    request: GetListInvoiceDto,
  ) {
    const storeId = validateStoreId(header.store_id);

    const {
      page,
      pageSize,
      invoiceNumber,
      createdAtFrom,
      createdAtTo,
      orderType,
      paymentStatus,
      staffId,
    } = request;

    const createdAtFilter: Record<string, Date> = {};
    if (createdAtFrom) {
      createdAtFilter.gte = new Date(createdAtFrom);
    }
    if (createdAtTo) {
      createdAtFilter.lte = new Date(createdAtTo);
    }

    // order by clause
    const orderByField = request.orderBy ?? 'created_at';
    const orderDirection = request.orderDirection ?? 'desc';

    const filters: Prisma.invoiceWhereInput = {
      ...(Object.keys(createdAtFilter).length > 0 && {
        created_at: createdAtFilter,
      }),
      ...(paymentStatus && {
        payment_status: {
          in: Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus],
        },
      }),
      ...(staffId && {
        cashier_id: {
          equals: staffId,
        },
      }),
      ...(orderType && {
        order_type: { in: Array.isArray(orderType) ? orderType : [orderType] },
      }),
      ...(invoiceNumber && { invoice_number: { equals: invoiceNumber } }),
      store_id: storeId, // Filter by store ID
    };

    const [items, total] = await Promise.all([
      this._prisma.invoice.findMany({
        where: filters,
        include: {
          customer: true,
          users: true,
          invoice_details: {
            include: {
              products: {
                include: {
                  categories_has_products: {
                    include: { categories: true },
                  },
                },
              },
              variant: true,
            },
          },
          payment_methods: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          [orderByField]: orderDirection,
        },
      }),
      this._prisma.invoice.count({
        where: filters,
      }),
    ]);

    // Add queue number for each invoice based on created_at order in the same day
    const itemsWithQueue = await Promise.all(
      items.map(async (invoice) => {
        if (!invoice.created_at) {
          return {
            ...invoice,
            queue: 0, // If no created_at, set queue to 0
          };
        }

        const invoiceDate = new Date(invoice.created_at);
        const startOfDay = new Date(invoiceDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(invoiceDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Count invoices created before this invoice on the same day in the same store
        const queueNumber = await this._prisma.invoice.count({
          where: {
            store_id: storeId,
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
              lt: invoice.created_at,
            },
          },
        });

        return {
          ...invoice,
          queue: queueNumber + 1, // Queue starts from 1
        };
      }),
    );

    return {
      items: itemsWithQueue,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  public async getInvoicePreview(request: GetInvoiceDto) {
    const invoice = await this._prisma.invoice.findFirst({
      where: {
        ...{ id: request.invoiceId },
      },
      include: {
        customer: true,
        stores: true,
        invoice_details: {
          include: {
            products: true,
            variant: true,
            catalog_bundling: true,
            invoice_bundling_items: {
              include: {
                products: true,
              },
            },
          },
        },
        users: {
          select: { id: true, fullname: true },
        },
        invoice_charges: true,
        payment_methods: true,
        payment_rounding_settings: true,
      },
    });

    if (!invoice) {
      this.logger.error(`Invoice with ID ${request.invoiceId} not found.`);
      throw new NotFoundException(
        `Invoice with ID ${request.invoiceId} not found.`,
      );
    }

    // Calculate queue number for this invoice based on created_at order in the same day
    let queueNumber = 0;
    if (invoice.created_at && invoice.store_id) {
      const invoiceDate = new Date(invoice.created_at);
      const startOfDay = new Date(invoiceDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(invoiceDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Count invoices created before this invoice on the same day in the same store
      const count = await this._prisma.invoice.count({
        where: {
          store_id: invoice.store_id,
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
            lt: invoice.created_at,
          },
        },
      });

      queueNumber = count + 1; // Queue starts from 1
    }

    // formatting returned response
    const formatted = {
      ...invoice,
      queue: queueNumber,
      invoiceCharges: invoice.invoice_charges.map((c) => ({
        ...c,
        percentage: (c.percentage as Prisma.Decimal).toNumber(),
        amount: (c.amount as Prisma.Decimal).toNumber(),
      })),
    };

    return formatted;
  }

  public async UpdateInvoiceOrderStatus(
    invoiceId: string,
    request: UpdateInvoiceOrderStatusDto,
  ) {
    // check invoice
    const invoice = await this.findInvoiceId(invoiceId);

    // update payload
    const updatePayload: InvoiceUpdateDto = {
      order_status: request.orderStatus,
    };

    // add complete time
    if (request.orderStatus == order_status.completed) {
      updatePayload.complete_order_at = new Date();
    }

    await this._prisma.$transaction(async (tx) => {
      // update status
      await this.update(tx, invoiceId, updatePayload);
    });

    return {
      success: true,
      message: `Invoice number ${invoice.invoice_number} order status has been updated`,
    };
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
      safeInvoice: safeInvoice,
    };
  }

  public async generateInvoiceNumber(storeId: string): Promise<string> {
    const today = new Date();

    const setting = await this._prisma.invoice_settings.findUnique({
      where: { store_id: storeId },
    });

    if (!setting) {
      throw new NotFoundException('Invoice settings not found for this store');
    }

    const resetType = setting.reset_sequence?.toLowerCase() ?? 'never';
    const incrementBy = setting.increment_by ?? 1;
    const startingNumber = setting.starting_number ?? 1;

    const getResetKey = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };

    const resetKey = getResetKey(today);

    const isSameResetPeriod = (lastDate: Date, currentDate: Date): boolean => {
      switch (resetType) {
        case 'daily':
          return (
            lastDate.getFullYear() === currentDate.getFullYear() &&
            lastDate.getMonth() === currentDate.getMonth() &&
            lastDate.getDate() === currentDate.getDate()
          );
        case 'weekly': {
          const getWeekStart = (date: Date) => {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);
            return monday;
          };
          const start1 = getWeekStart(lastDate);
          const start2 = getWeekStart(currentDate);
          return start1.getTime() === start2.getTime();
        }
        case 'monthly':
          return (
            lastDate.getFullYear() === currentDate.getFullYear() &&
            lastDate.getMonth() === currentDate.getMonth()
          );
        case 'quarterly': {
          const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3);
          return (
            lastDate.getFullYear() === currentDate.getFullYear() &&
            getQuarter(lastDate) === getQuarter(currentDate)
          );
        }
        case 'yearly':
          return lastDate.getFullYear() === currentDate.getFullYear();
        case 'never':
        default:
          return true;
      }
    };

    const result = await this._prisma.$transaction(async (tx) => {
      const latestInvoice = await tx.invoice.findFirst({
        where: {
          store_id: storeId,
          invoice_number: { not: null },
        },
        orderBy: {
          invoice_number: 'desc',
        },
        take: 1,
      });

      let newNumber = startingNumber;

      if (latestInvoice?.invoice_number) {
        const lastPrefix = latestInvoice.invoice_number.slice(0, 8);
        const lastSeq = parseInt(latestInvoice.invoice_number.slice(8), 10);

        const lastDate = new Date(
          `${lastPrefix.slice(0, 4)}-${lastPrefix.slice(4, 6)}-${lastPrefix.slice(6, 8)}T00:00:00`,
        );

        const samePeriod = isSameResetPeriod(lastDate, today);

        if (samePeriod) {
          newNumber = Math.max(lastSeq + incrementBy, startingNumber);
        } else {
          newNumber = startingNumber;
        }
      }

      const paddedNumber = newNumber.toString().padStart(5, '0');
      return `${resetKey}${paddedNumber}`;
    });

    return result;
  }

  public async proceedInstantPayment(
    header: ICustomRequestHeaders,
    request: ProceedInstantPaymentDto,
  ) {
    const storeId = validateStoreId(header.store_id);

    await this.validatePaymentMethod(request.paymentMethodId, request.provider);

    const paymentProvider =
      request.provider === 'cash'
        ? undefined // use undefined for cash
        : this._paymentFactory.getProvider(request.provider);
    if (request.provider !== 'cash' && !paymentProvider) {
      this.logger.error(`Payment provider '${request.provider}' not found`);
      throw new NotFoundException(
        `Payment provider '${request.provider}' not found`,
      );
    }

    if (request.provider == 'cash' && !request.paymentAmount) {
      throw new BadRequestException(
        'Payment method is cash, please fill the payment amount',
      );
    }

    // create invoice ID
    const invoiceId = uuidv4();
    const now = new Date();
    const invoiceNumber = await this.generateInvoiceNumber(storeId);
    let grandTotal: number = 0;
    let totalProductDiscount: number = 0;
    let kitchenQueue: KitchenQueueAdd[] = [];
    await this._prisma.$transaction(
      async (tx) => {
        const invoiceData = {
          id: invoiceId,
          payment_methods_id: request.paymentMethodId,
          customer_id: request.customerId?.trim() || null,
          table_code: request.tableCode,
          payment_status:
            request.provider === 'cash'
              ? invoice_type.paid
              : invoice_type.unpaid,
          discount_amount: 0, // need to confirm
          order_type: request.orderType,
          subtotal: 0, // default value
          created_at: now,
          update_at: now,
          delete_at: null,
          paid_at: request.provider === 'cash' ? new Date() : null,
          tax_id: null,
          service_charge_id: null,
          tax_amount: null,
          service_charge_amount: null,
          grand_total: null,
          cashier_id: header.user?.id || null,
          invoice_number: invoiceNumber,
          order_status: order_status.placed,
          store_id: storeId,
          complete_order_at: null,
          payment_amount: null,
          change_amount: null,
          // voucher applied
          voucher_id: request.voucherId ?? null,
          voucher_amount: 0,
          total_product_discount: 0,
          rounding_setting_id: null,
          rounding_amount: null,
        };
        // create invoice with status unpaid
        await this.create(tx, invoiceData);

        // Calculate subtotal from original prices and total product discount
        let originalSubtotal = 0;
        let calculatedTotalProductDiscount = 0;

        for (const detail of request.products) {
          if (detail.type === 'single') {
            const product = await this._prisma.products.findUnique({
              where: { id: detail.productId },
              select: { price: true, discount_price: true },
            });

            if (!product) {
              this.logger.error(
                `Product with ID ${detail.productId} not found`,
              );
              throw new NotFoundException(
                `Product with ID ${detail.productId} not found`,
              );
            }

            const originalPrice = product.price ?? 0;
            const discountPrice = product.discount_price ?? 0;
            const productDiscount = originalPrice - discountPrice;

            // Get variant price if variant exists
            let variantPrice = 0;
            const validVariantId = await this.validateProductVariant(
              detail.productId,
              detail.variantId,
            );

            if (validVariantId) {
              const variant = await this._prisma.variant.findUnique({
                where: { id: validVariantId },
                select: { price: true },
              });

              if (variant) {
                variantPrice = variant.price ?? 0;
              }
            }

            // Calculate subtotal including variant price
            const itemSubtotal =
              (originalPrice + variantPrice) * detail.quantity;
            originalSubtotal += itemSubtotal;
            calculatedTotalProductDiscount += productDiscount * detail.quantity;
          } else if (detail.type === 'bundling') {
            const productBundling =
              await this._prisma.catalog_bundling.findUnique({
                where: { id: detail.bundlingId },
              });

            if (!productBundling) {
              throw new NotFoundException(
                `Product Bundling with ID ${detail.bundlingId} not found`,
              );
            }

            const products =
              await this._prisma.catalog_bundling_has_product.findMany({
                where: { catalog_bundling_id: detail.bundlingId },
              });

            let originalSubtotalBundling = 0;
            for (const item of products) {
              const product = await this._prisma.products.findUnique({
                where: { id: item.product_id },
                select: { price: true, discount_price: true },
              });

              if (!product) {
                this.logger.error(
                  `Product with ID ${detail.productId} not found`,
                );
                throw new NotFoundException(
                  `Product with ID ${detail.productId} not found`,
                );
              }

              const originalPrice = product.price ?? 0;
              originalSubtotalBundling += originalPrice * detail.quantity;
            }

            originalSubtotal += originalSubtotalBundling;
            calculatedTotalProductDiscount +=
              (originalSubtotalBundling - (productBundling.price ?? 0)) *
              detail.quantity;
          } else {
            this.logger.error(`Invalid product type ${detail.type}`);
            throw new NotFoundException(`Invalid product type ${detail.type}`);
          }
        }

        // Set the total product discount to be used outside transaction
        totalProductDiscount = calculatedTotalProductDiscount;

        // calculate the grand total
        const calculation = await this.calculateTotal(
          tx,
          request,
          storeId,
          invoiceId,
        );
        grandTotal = calculation.grandTotal;

        // Get payment rounding setting for this store
        const paymentRoundingSetting =
          await tx.payment_rounding_settings.findFirst({
            where: {
              store_id: storeId,
              is_enabled: true,
            },
          });

        // update invoice with original subtotal and total product discount
        await this.update(tx, invoiceId, {
          subtotal: originalSubtotal, // subtotal dari original price
          tax_id: calculation.taxId,
          service_charge_id: calculation.serviceChargeId,
          tax_amount: calculation.tax,
          service_charge_amount: calculation.serviceCharge,
          grand_total: grandTotal,
          payment_amount: calculation.paymentAmount,
          change_amount: calculation.changeAmount,
          // voucher applied
          voucher_id: request.voucherId ?? undefined,
          voucher_amount: calculation.voucherAmount,
          total_product_discount: calculatedTotalProductDiscount, // total product discount
          // payment rounding
          rounding_setting_id: paymentRoundingSetting?.id ?? undefined,
          rounding_amount: request.rounding_amount ?? undefined,
        });

        // insert the customer has invoice (if exists)
        if (request.customerId) {
          await this.createCustomerInvoice(tx, invoiceId, request.customerId);
        }

        for (const detail of request.products) {
          if (detail.type == 'single') {
            // Get product data for prices
            const product = await this._prisma.products.findUnique({
              where: { id: detail.productId },
              select: { price: true, discount_price: true },
            });

            if (!product) {
              this.logger.error(
                `Product with ID ${detail.productId} not found`,
              );
              throw new NotFoundException(
                `Product with ID ${detail.productId} not found`,
              );
            }

            const originalPrice = product.price ?? 0;
            const discountPrice = product.discount_price ?? 0;
            const productDiscount = originalPrice - discountPrice;

            // find variant price
            let variantPrice = 0;
            const found = calculation.items.find(
              (p) =>
                p.productId === detail.productId &&
                p.variantId === detail.variantId,
            );
            if (found) {
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
              product_id: detail.productId ?? null,
              catalog_bundling_id: null,
              product_price: originalPrice, // menggunakan original price
              notes: detail.notes,
              order_type: request.orderType,
              qty: detail.quantity,
              variant_id: validVariantId,
              variant_price: variantPrice,
              product_discount: productDiscount, // discount per unit
            };

            // create invoice with status unpaid
            await this.createInvoiceDetail(tx, invoiceDetailData);

            // looping each quantity
            for (let i = 0; i < detail.quantity; i++) {
              const queue: KitchenQueueAdd = {
                id: uuidv4(),
                invoice_id: invoiceId,
                order_type: request.orderType,
                order_status: order_status.placed,
                product_id: detail.productId,
                variant_id: detail.variantId ?? null,
                store_id: storeId,
                customer_id: request.customerId,
                notes: detail.notes ?? '',
                created_at: now,
                updated_at: now,
                table_code: request.tableCode,
              };

              kitchenQueue.push(queue);
            }
          } else if (detail.type == 'bundling') {
            const productBundling =
              await this._prisma.catalog_bundling.findUnique({
                where: { id: detail.bundlingId },
              });

            if (!productBundling) {
              throw new NotFoundException(
                `Product Bundling with ID ${detail.bundlingId} not found`,
              );
            }

            const bundlingProducts =
              await this._prisma.catalog_bundling_has_product.findMany({
                where: { catalog_bundling_id: detail.bundlingId },
              });

            let originSubBundling = 0;
            let discountSubBundling = 0;

            for (const item of bundlingProducts) {
              const product = await this._prisma.products.findUnique({
                where: { id: item.product_id },
                select: { price: true, discount_price: true },
              });

              if (!product) {
                this.logger.error(
                  `Product with ID ${detail.productId} not found`,
                );
                throw new NotFoundException(
                  `Product with ID ${detail.productId} not found`,
                );
              }

              const originalPrice = product.price ?? 0;
              originSubBundling += originalPrice * detail.quantity;
            }

            discountSubBundling =
              originSubBundling -
              (productBundling.price ?? 0) * detail.quantity;

            // create invoice detail ID
            const invoiceDetailId = uuidv4();
            const invoiceDetailData = {
              id: invoiceDetailId,
              invoice_id: invoiceId,
              product_id: null,
              catalog_bundling_id: detail.bundlingId ?? null,
              product_price: originSubBundling, // menggunakan original price
              notes: detail.notes,
              order_type: request.orderType,
              qty: detail.quantity,
              variant_id: null,
              variant_price: null,
              product_discount: discountSubBundling, // discount per unit
            };

            // create invoice with status unpaid
            await this.createInvoiceDetail(tx, invoiceDetailData);

            // insert all bundled products to invoice_bundling_items
            for (const bp of bundlingProducts) {
              await tx.invoice_bundling_items.create({
                data: {
                  id: uuidv4(),
                  invoice_id: invoiceId,
                  invoice_detail_id: invoiceDetailId,
                  product_id: bp.product_id,
                  qty: detail.quantity ?? 1,
                  created_at: now,
                  updated_at: now,
                },
              });

              // Add each product in bundling to kitchen queue
              for (let i = 0; i < (bp.quantity ?? 1) * detail.quantity; i++) {
                kitchenQueue.push({
                  id: uuidv4(),
                  invoice_id: invoiceId,
                  order_type: request.orderType,
                  order_status: order_status.placed,
                  product_id: bp.product_id,
                  catalog_bundling_id: bp.catalog_bundling_id,
                  store_id: storeId,
                  customer_id: request.customerId,
                  notes: detail.notes ?? null,
                  created_at: now,
                  updated_at: now,
                  table_code: request.tableCode,
                });
              }
            }
          } else {
            this.logger.error(`Invalid product type ${detail.type}`);
            throw new NotFoundException(`Invalid product type ${detail.type}`);
          }
        }

        // create kitchen queue
        await this._kitchenQueue.createKitchenQueue(tx, kitchenQueue);

        if (request.provider === 'cash') {
          // note: response for cash payment
          // get opened cash drawer
          const cashDrawer =
            await this._cashDrawer.getCashDrawerStatus(storeId);
          if (!cashDrawer) {
            this.logger.error(`Cash Drawer with store id ${storeId} is closed`);
            throw new NotFoundException(
              `Cash Drawer with store id ${storeId} is closed`,
            );
          }

          // Skip if cashDrawerId is undefined or null
          if (cashDrawer) {
            // add cash drawer transaction
            await this._cashDrawer.addCashDrawerTransaction(
              cashDrawer?.id,
              calculation.paymentAmount,
              calculation.changeAmount,
              2,
              '', // notes still empty
              header.user?.id,
            );
          }
        }
      },
      { timeout: 500_000 },
    );

    const integration = await this._prisma.integrations.findFirst({
      where: { stores_id: storeId },
    });
    // notify the FE
    this._notificationHelper.notifyNewOrder(storeId);
    if (request.provider !== 'cash') {
      const response = await this.initiatePaymentBasedOnMethod(
        request.paymentMethodId,
        paymentProvider,
        invoiceId,
        grandTotal,
      );
      return {
        ...response,
        invoiceId: invoiceId,
        qrImage: integration?.image || null,
      };
    }

    // Create stock adjustments if store is retail and payment is successful (cash)
    if (request.provider === 'cash') {
      await this.createStockAdjustmentsForInvoice(invoiceId, storeId);
    }

    // Check loyalty points if customer exists
    if (request.customerId && request.provider === 'cash') {
      const getPoints = await this.calculateLoyaltyPoints(
        storeId,
        request.products,
        grandTotal,
        request.redeemLoyalty ?? null,
      );

      if (
        getPoints.earnPointsBySpend > 0 ||
        getPoints.earnPointsByProduct > 0
      ) {
        await this._prisma.customer_loyalty_transactions.create({
          data: {
            customer_id: request.customerId,
            invoice_id: invoiceId,
            type: 'earn',
            points: getPoints.earnPointsBySpend + getPoints.earnPointsByProduct,
            description: getPoints.description,
          },
        });

        if (request.redeemLoyalty) {
          const benefit = await this._prisma.loyalty_points_benefit.findFirst({
            where: {
              id: request.redeemLoyalty.loyalty_points_benefit_id,
            },
          });

          if (benefit) {
            await this._prisma.customer_loyalty_transactions.create({
              data: {
                customer_id: request.customerId,
                invoice_id: invoiceId,
                type: 'redeem',
                points: benefit.points_needs ?? 0,
                description: 'Redeem ' + benefit.benefit_name,
              },
            });
          }
        }

        await this.updateCustomerPoint(request.customerId);
      }
    }

    return {
      paymentMethodId: request.paymentMethodId,
      invoiceId: invoiceId,
      grandTotal: grandTotal,
      totalProductDiscount: totalProductDiscount,
    };
  }

  public async proceedCheckout(
    header: ICustomRequestHeaders,
    request: ProceedCheckoutInvoiceDto,
  ) {
    const storeId = validateStoreId(header.store_id);

    // create invoice ID
    const invoiceId = uuidv4();
    const now = new Date();
    const invoiceNumber = await this.generateInvoiceNumber(storeId);
    let totalProductDiscount: number = 0;
    let kitchenQueue: KitchenQueueAdd[] = [];

    await this._prisma.$transaction(async (tx) => {
      // Calculate subtotal from original prices and total product discount
      let originalSubtotal = 0;
      let calculatedTotalProductDiscount = 0;

      for (const detail of request.products) {
        if (detail.type === 'single') {
          const product = await this._prisma.products.findUnique({
            where: { id: detail.productId },
            select: { price: true, discount_price: true },
          });

          if (!product) {
            this.logger.error(`Product with ID ${detail.productId} not found`);
            throw new NotFoundException(
              `Product with ID ${detail.productId} not found`,
            );
          }

          const originalPrice = product.price ?? 0;
          const discountPrice = product.discount_price ?? 0;
          const productDiscount = originalPrice - discountPrice;

          // Get variant price if variant exists
          let variantPrice = 0;
          const validVariantId = await this.validateProductVariant(
            detail.productId,
            detail.variantId,
          );

          if (validVariantId) {
            const variant = await this._prisma.variant.findUnique({
              where: { id: validVariantId },
              select: { price: true },
            });

            if (variant) {
              variantPrice = variant.price ?? 0;
            }
          }

          // Calculate subtotal including variant price
          const itemSubtotal = (originalPrice + variantPrice) * detail.quantity;
          originalSubtotal += itemSubtotal;
          calculatedTotalProductDiscount += productDiscount * detail.quantity;
        } else if (detail.type === 'bundling') {
          const productBundling =
            await this._prisma.catalog_bundling.findUnique({
              where: { id: detail.bundlingId },
            });

          if (!productBundling) {
            throw new NotFoundException(
              `Product Bundling with ID ${detail.bundlingId} not found`,
            );
          }

          const products =
            await this._prisma.catalog_bundling_has_product.findMany({
              where: { catalog_bundling_id: detail.bundlingId },
            });

          let originalSubtotalBundling = 0;
          for (const item of products) {
            const product = await this._prisma.products.findUnique({
              where: { id: item.product_id },
              select: { price: true, discount_price: true },
            });

            if (!product) {
              this.logger.error(
                `Product with ID ${detail.productId} not found`,
              );
              throw new NotFoundException(
                `Product with ID ${detail.productId} not found`,
              );
            }

            const originalPrice = product.price ?? 0;
            originalSubtotalBundling += originalPrice * detail.quantity;
          }

          originalSubtotal += originalSubtotalBundling;
          calculatedTotalProductDiscount +=
            (originalSubtotalBundling - (productBundling.price ?? 0)) *
            detail.quantity;
        } else {
          this.logger.error(`Invalid product type ${detail.type}`);
          throw new NotFoundException(`Invalid product type ${detail.type}`);
        }
      }

      // Set the total product discount to be used outside transaction
      totalProductDiscount = calculatedTotalProductDiscount;

      const calculation = await this.calculateTotal(tx, request, storeId);

      // Get payment rounding setting for this store
      const paymentRoundingSetting =
        await tx.payment_rounding_settings.findFirst({
          where: {
            store_id: storeId,
            is_enabled: true,
          },
        });

      const invoiceData = {
        id: invoiceId,
        payment_methods_id: null,
        customer_id: request.customerId ?? null,
        table_code: request.tableCode,
        payment_status: invoice_type.unpaid,
        discount_amount: 0, // need to confirm
        order_type: request.orderType,
        subtotal: originalSubtotal, // subtotal dari original price + variant
        created_at: now,
        update_at: now,
        delete_at: null,
        paid_at: null,
        tax_id: null,
        service_charge_id: null,
        tax_amount: null,
        service_charge_amount: null,
        grand_total: null,
        cashier_id: header.user?.id || null,
        invoice_number: invoiceNumber,
        order_status: order_status.placed,
        store_id: storeId,
        complete_order_at: null,
        payment_amount: null,
        change_amount: null,
        // voucher applied
        voucher_id:
          request.voucherId && request.voucherId.trim() !== ''
            ? request.voucherId
            : null,
        voucher_amount: calculation.voucherAmount ?? 0,
        total_product_discount: calculatedTotalProductDiscount,
        rounding_setting_id: paymentRoundingSetting?.id ?? null,
        rounding_amount: request.rounding_amount ?? null,
      };

      // create invoice with status unpaid
      await this.create(tx, invoiceData);

      for (const detail of request.products) {
        if (detail.type == 'single') {
          // Get product data for prices
          const product = await this._prisma.products.findUnique({
            where: { id: detail.productId },
            select: { price: true, discount_price: true },
          });

          if (!product) {
            this.logger.error(`Product with ID ${detail.productId} not found`);
            throw new NotFoundException(
              `Product with ID ${detail.productId} not found`,
            );
          }

          const originalPrice = product.price ?? 0;
          const discountPrice = product.discount_price ?? 0;
          const productDiscount = originalPrice - discountPrice;

          // find the price
          let variantPrice = 0;
          const found = calculation.items.find(
            (p) =>
              p.productId === detail.productId &&
              p.variantId === detail.variantId,
          );
          if (found) {
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
            product_id: detail.productId ?? null,
            catalog_bundling_id: detail.bundlingId ?? null,
            product_price: originalPrice, // menggunakan original price
            notes: detail.notes,
            order_type: request.orderType,
            qty: detail.quantity,
            variant_id: validVariantId,
            variant_price: variantPrice,
            product_discount: productDiscount, // discount per unit
          };

          // create invoice with status unpaid
          await this.createInvoiceDetail(tx, invoiceDetailData);

          // looping each quantity
          for (let i = 0; i < detail.quantity; i++) {
            const queue: KitchenQueueAdd = {
              id: uuidv4(),
              invoice_id: invoiceId,
              order_type: request.orderType,
              order_status: order_status.placed,
              product_id: detail.productId,
              variant_id: detail.variantId ?? null,
              store_id: storeId,
              customer_id: request.customerId,
              notes: detail.notes ?? '',
              created_at: now,
              updated_at: now,
              table_code: request.tableCode,
            };

            kitchenQueue.push(queue);
          }
        } else if (detail.type == 'bundling') {
          const productBundling =
            await this._prisma.catalog_bundling.findUnique({
              where: { id: detail.bundlingId },
            });

          if (!productBundling) {
            throw new NotFoundException(
              `Product Bundling with ID ${detail.bundlingId} not found`,
            );
          }

          const bundlingProducts =
            await this._prisma.catalog_bundling_has_product.findMany({
              where: { catalog_bundling_id: detail.bundlingId },
            });

          let originSubBundling = 0;
          let discountSubBundling = 0;

          for (const item of bundlingProducts) {
            const product = await this._prisma.products.findUnique({
              where: { id: item.product_id },
              select: { price: true, discount_price: true },
            });

            if (!product) {
              this.logger.error(
                `Product with ID ${detail.productId} not found`,
              );
              throw new NotFoundException(
                `Product with ID ${detail.productId} not found`,
              );
            }

            const originalPrice = product.price ?? 0;
            originSubBundling += originalPrice * detail.quantity;
          }

          discountSubBundling =
            originSubBundling - (productBundling.price ?? 0) * detail.quantity;

          // create invoice detail ID
          const invoiceDetailId = uuidv4();
          const invoiceDetailData = {
            id: invoiceDetailId,
            invoice_id: invoiceId,
            product_id: null,
            catalog_bundling_id: detail.bundlingId ?? null,
            product_price: originSubBundling, // menggunakan original price
            notes: detail.notes,
            order_type: request.orderType,
            qty: detail.quantity,
            variant_id: null,
            variant_price: null,
            product_discount: discountSubBundling, // discount per unit
          };

          // create invoice with status unpaid
          await this.createInvoiceDetail(tx, invoiceDetailData);

          // insert all bundled products to invoice_bundling_items
          for (const bp of bundlingProducts) {
            await tx.invoice_bundling_items.create({
              data: {
                id: uuidv4(),
                invoice_id: invoiceId,
                invoice_detail_id: invoiceDetailId,
                product_id: bp.product_id,
                qty: detail.quantity ?? 1,
                created_at: now,
                updated_at: now,
              },
            });

            // Add each product in bundling to kitchen queue
            for (let i = 0; i < (bp.quantity ?? 1) * detail.quantity; i++) {
              kitchenQueue.push({
                id: uuidv4(),
                invoice_id: invoiceId,
                order_type: request.orderType,
                order_status: order_status.placed,
                product_id: bp.product_id,
                catalog_bundling_id: bp.catalog_bundling_id,
                store_id: storeId,
                customer_id: request.customerId,
                notes: detail.notes ?? null,
                created_at: now,
                updated_at: now,
                table_code: request.tableCode,
              });
            }
          }
        } else {
          this.logger.error(`Invalid product type ${detail.type}`);
          throw new NotFoundException(`Invalid product type ${detail.type}`);
        }
      }

      // insert the customer has invoice (if exists)
      if (request.customerId) {
        await this.createCustomerInvoice(tx, invoiceId, request.customerId);
      }

      // create kitchen queue
      await this._kitchenQueue.createKitchenQueue(tx, kitchenQueue);
    });

    const result = {
      orderId: invoiceId,
      totalProductDiscount: totalProductDiscount,
    };

    // notify the FE
    this._notificationHelper.notifyNewOrder(storeId);

    return result;
  }

  public async processUpsertInvoiceItems(
    header: ICustomRequestHeaders,
    invoiceId: string,
    request: UpsertInvoiceItemDto,
  ) {
    const storeId = validateStoreId(header.store_id);
    await this._prisma.$transaction(
      async (tx) => {
        // Retrieve the invoice record and ensure it is not already paid
        const invoice = await this.findInvoiceId(invoiceId);

        if (invoice.payment_status === payment_type.paid) {
          throw new BadRequestException(
            `Invoice payment status is paid, the invoice cannot be changed`,
          );
        }

        // Get all existing kitchen queue entries associated with the invoice
        const kitchenQueues =
          await this._kitchenQueue.findKitchenQueueByInvoiceId(invoice.id);

        // Get a list of product IDs from frontend payload
        const feProductIds = request.products.map((p) => p.productId);

        const now = new Date();

        // Iterate through each product in the payload
        for (const feProduct of request.products) {
          // note: Check for product variant
          const validVariantId = await this.validateProductVariant(
            feProduct.productId,
            feProduct.variantId,
          );
          const productId = feProduct.productId;

          // Group all queues related to the current product
          const existingQueues = kitchenQueues.filter(
            (q) =>
              q.product_id === productId &&
              (q.variant_id ?? null) === (validVariantId ?? null),
          );

          // Split into editable and locked queues based on order_status
          const editableQueues = existingQueues.filter(
            (q) => q.order_status === order_status.placed,
          );
          const lockedQueues = existingQueues.filter(
            (q) => q.order_status !== order_status.placed,
          );

          // Determine if there is any change from frontend input
          const currentQty = editableQueues.length + lockedQueues.length;
          const isChanged =
            feProduct.quantity !== currentQty ||
            feProduct.notes !==
              (editableQueues[0]?.notes ?? lockedQueues[0]?.notes ?? '');

          // Check if variant has changed
          const variantChanged =
            validVariantId !==
            (editableQueues[0]?.variant_id ??
              lockedQueues[0]?.variant_id ??
              null);

          // If the product is completely new (not in queue), create it
          if (existingQueues.length === 0) {
            this.logger.log(`Creating new product ${productId}`);
            await this.createInvoiceAndKitchenQueueItem(
              tx,
              invoice,
              feProduct,
              now,
            );
            continue;
          }

          // If no changes detected, skip to next product
          if (!isChanged && !variantChanged) {
            this.logger.log(`No change for product ${productId}, skipping...`);
            continue;
          }

          // Allow updating variantId only when all queues are still 'placed'
          if (!isChanged && variantChanged) {
            const allPlaced = existingQueues.every(
              (q) => q.order_status === order_status.placed,
            );

            if (!allPlaced) {
              this.logger.warn(
                `Cannot update variant for product ${productId} because one or more items are already in process`,
              );
              throw new BadRequestException(
                `Cannot update variant for product ${productId}, already in process.`,
              );
            }

            this.logger.log(
              `Updating variant for product ${productId} to ${validVariantId}`,
            );

            await tx.kitchen_queue.updateMany({
              where: {
                invoice_id: invoice.id,
                product_id: productId,
                order_status: order_status.placed,
              },
              data: {
                variant_id: validVariantId,
              },
            });

            await tx.invoice_details.updateMany({
              where: {
                invoice_id: invoice.id,
                product_id: productId,
              },
              data: {
                variant_id: validVariantId,
              },
            });

            continue;
          }

          // Update invoice_details entry with new quantity and notes
          await tx.invoice_details.updateMany({
            where: {
              invoice_id: invoice.id,
              product_id: productId,
            },
            data: {
              qty: feProduct.quantity,
              notes: feProduct.notes,
            },
          });

          const desiredQty = feProduct.quantity;
          const lockedQty = lockedQueues.length;
          const editableQty = editableQueues.length;

          // Prevent reduction below locked/in-progress quantity
          if (desiredQty < lockedQty) {
            this.logger.error(
              `Cannot reduce quantity of product ${productId} below ${lockedQty} due to existing processed items`,
            );
            throw new BadRequestException(
              `Cannot reduce quantity of product ${productId} below items already in progress (${lockedQty})`,
            );
          }

          const allowedEdit = desiredQty - lockedQty;

          // If more queue entries needed, create additional 'placed' rows

          if (allowedEdit > editableQueues.length) {
            const toAdd = allowedEdit - editableQueues.length;
            this.logger.log(`Adding ${toAdd} queue(s) for ${productId}`);
            for (let i = 0; i < toAdd; i++) {
              await tx.kitchen_queue.create({
                data: {
                  id: uuidv4(),
                  invoice_id: invoice.id,
                  product_id: productId,
                  variant_id: validVariantId || null,
                  order_status: order_status.placed,
                  notes: feProduct.notes ?? null,
                  created_at: new Date(),
                  store_id: invoice.store_id!,
                  order_type: invoice.order_type!,
                },
              });
            }
          }
          // If fewer queue entries needed, delete some 'placed' ones
          else if (allowedEdit < editableQueues.length) {
            const toDelete = editableQueues.slice(
              0,
              editableQueues.length - allowedEdit,
            );
            this.logger.log(
              `Removing ${toDelete.length} queue(s) for ${productId}`,
            );
            for (const item of toDelete) {
              await tx.kitchen_queue.delete({
                where: { id: item.id },
              });
            }
          }
        }

        // List productId + variantId pairs from DB
        const dbProductPairs = kitchenQueues.map((q) => ({
          productId: q.product_id,
          variantId: q.variant_id ?? null,
        }));

        // Create a list of pairs from the frontend
        const feProductPairs = request.products.map((p) => ({
          productId: p.productId,
          variantId: p.variantId?.trim() === '' ? null : p.variantId,
        }));

        const toDeletePairs = dbProductPairs.filter(
          (dbItem) =>
            !feProductPairs.some(
              (feItem) =>
                feItem.productId === dbItem.productId &&
                (feItem.variantId ?? null) === (dbItem.variantId ?? null),
            ),
        );

        // Handle deletion of products that were removed from frontend payload
        const toDeleteProductIds = kitchenQueues
          .map((q) => q.product_id)
          .filter((pid) => !feProductIds.includes(pid ?? ''));

        const uniqueToDelete = [...new Set(toDeleteProductIds)];

        for (const pair of toDeletePairs) {
          const { productId, variantId } = pair;

          const productQueues = kitchenQueues.filter(
            (q) =>
              q.product_id === productId &&
              (q.variant_id ?? null) === (variantId ?? null),
          );

          // Do not allow deletion if any queue has been processed
          const hasInProgress = productQueues.some(
            (q) => q.order_status !== order_status.placed,
          );

          if (hasInProgress && productId) {
            // Get product name for better error message
            const product = await tx.products.findUnique({
              where: { id: productId },
              select: { name: true },
            });
            const productName = product?.name || productId;

            this.logger.warn(
              `Skipping deletion for product ${productName} due to existing in_progress queue`,
            );
            throw new BadRequestException(
              `Product ${productName} cannot be deleted, already in process.`,
            );
          }

          this.logger.log(`Deleting product ${productId}...`);
          await tx.kitchen_queue.deleteMany({
            where: {
              invoice_id: invoice.id,
              product_id: productId,
              variant_id: variantId,
            },
          });

          await tx.invoice_details.deleteMany({
            where: {
              invoice_id: invoice.id,
              product_id: productId,
              variant_id: variantId,
            },
          });
        }
      },
      {
        timeout: 300_000,
      },
    );

    // notify the FE
    this._notificationHelper.notifyNewOrder(storeId);

    // All operations successful
    return { message: 'Invoice products processed successfully' };
  }

  /**
   * Helper method to create invoice_detail and kitchen_queue items for a product
   * @param tx - Prisma transaction client for ensuring data consistency
   * @param invoice - The invoice record to associate the items with
   * @param product - Product information including quantity, notes, and variant details
   * @param now - Consistent timestamp to ensure all related records have the same creation time
   */
  private async createInvoiceAndKitchenQueueItem(
    tx: Prisma.TransactionClient,
    invoice: invoice,
    product: ProductDto,
    now: Date,
  ) {
    let productPrice = 0;
    let variantPrice = 0;

    const productData = await this._prisma.products.findFirst({
      where: { id: product.productId },
      select: { price: true, discount_price: true },
    });

    if (!productData) {
      throw new BadRequestException(
        `Product with id ${product.productId} not found`,
      );
    }

    if (productData.discount_price == 0) {
      productPrice = productData.price ?? 0;
    } else {
      productPrice = productData.discount_price ?? 0;
    }

    if (product.variantId !== '') {
      const variant = await this._variantService.getVariant(product.variantId);
      variantPrice = variant?.price;
    }

    const invoiceDetailData = {
      id: uuidv4(),
      invoice_id: invoice.id,
      type: product.type ?? null,
      product_id: product.productId ?? null,
      catalog_bundling_id: product.bundlingId ?? null,
      product_price: productPrice,
      notes: product.notes ?? null,
      qty: product.quantity,
      variant_id: product.variantId ?? null,
      variant_price: variantPrice ?? 0,
      product_discount: 0,
    };

    await this.createInvoiceDetail(tx, invoiceDetailData);

    for (let i = 0; i < product.quantity; i++) {
      await this._kitchenQueue.createKitchenQueue(tx, [
        {
          id: uuidv4(),
          invoice_id: invoice.id,
          product_id: product.productId,
          variant_id: product.variantId,
          notes: product.notes ?? null,
          order_status: order_status.placed,
          created_at: now,
          updated_at: now,
          order_type: invoice.order_type ?? order_type.dine_in, // dine_in order type is more often
          store_id: invoice.store_id ?? '',
          table_code: invoice.table_code ?? '',
          customer_id: invoice.customer_id ?? undefined,
        },
      ]);
    }
  }

  // Helper to update invoice_detail + kitchen_queue
  private async updateInvoiceAndKitchenQueueItem(
    tx: Prisma.TransactionClient,
    invoice: invoice,
    product: ProductDto,
  ) {
    let variantTotal = await this.calculateProductVariantTotal(
      product.variantId,
      product.quantity,
    );

    let productTotal = await this.calculateProductTotal(
      product.productId,
      product.quantity,
    );

    // update invoice detail
    await this.upsertInvoiceDetail(
      tx,
      {
        qty: product.quantity,
        notes: product.notes ?? null,
        productTotal: productTotal ?? 0,
        variantTotal: variantTotal ?? 0,
      },
      {
        invoice_id: invoice.id,
        product_id: product.productId,
        variant_id: product.variantId,
      },
    );

    // update kitchen queue
    await this._kitchenQueue.updateKitchenQueue(
      tx,
      {
        notes: product.notes ?? null,
      },
      {
        invoice_id: invoice.id,
        product_variant_id: product.variantId,
      },
    );
  }

  // Helper to calculate total price (fetch variant price from DB)
  private async calculateProductVariantTotal(
    variantId: string,
    qty: number,
  ): Promise<number> {
    if (variantId !== '') {
      const variant = await this._variantService.getVariant(variantId);
      return variant?.price * qty;
    }

    return 0;
  }

  private async calculateProductTotal(
    productId: string,
    qty: number,
  ): Promise<number> {
    if (productId !== '') {
      const product = await this._productService.getProduct(productId);

      // use the discounted price
      if (product.discount_price !== 0) {
        return product?.discount_price * qty;
      }

      return product?.price * qty;
    }

    return 0;
  }

  public async proceedPayment(
    header: ICustomRequestHeaders,
    request: ProceedPaymentDto,
  ) {
    const storeId = validateStoreId(header.store_id);
    // Check the invoice is unpaid
    const invoice = await this.findInvoiceId(request.invoiceId);
    if (invoice.payment_status !== invoice_type.unpaid) {
      this.logger.error(`Invoice status is not unpaid`);
      throw new BadRequestException(`Invoice status is not unpaid`);
    }

    const method = await this.validatePaymentMethod(
      request.paymentMethodId,
      request.provider,
    );

    // define payment method and provider
    const paymentProvider =
      request.provider === 'cash'
        ? undefined // use undefined for cash
        : this._paymentFactory.getProvider(request.provider);

    if (request.provider !== 'cash' && !paymentProvider) {
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

    // jika invoice memiliki applied voucher
    if (invoice.voucher_id) {
      calculationEstimationDto.voucherId = invoice.voucher_id;
    }

    let grandTotal = 0;
    let paymentAmount = 0;
    let changeAmount = 0;
    await this._prisma.$transaction(async (tx) => {
      // calculate estimation
      const calculation = await this.calculateTotal(
        tx,
        calculationEstimationDto,
        invoice.store_id ?? undefined,
        invoice.id,
      );

      grandTotal = calculation.grandTotal;
      paymentAmount = calculation.paymentAmount;
      changeAmount = calculation.changeAmount;

      // update invoice
      await this.update(tx, invoice.id, {
        payment_status:
          method.name === 'Cash' ? invoice_type.paid : invoice_type.unpaid,
        subtotal: calculation.subTotal, // harga sebelum potongan voucher
        tax_id: calculation.taxId,
        paid_at: method.name === 'Cash' ? new Date() : undefined,
        service_charge_id: calculation.serviceChargeId,
        tax_amount: calculation.tax,
        service_charge_amount: calculation.serviceCharge,
        grand_total: calculation.grandTotal,
        payment_method_id: request.paymentMethodId,
        payment_amount: calculation.paymentAmount,
        change_amount: calculation.changeAmount,
        voucher_amount: calculation.voucherAmount ?? 0,
      });
    });

    const integration = await this._prisma.integrations.findFirst({
      where: { stores_id: storeId },
    });
    if (method.name === 'Qris') {
      // const response = await this.initiatePaymentBasedOnMethod(
      //   request.paymentMethodId,
      //   paymentProvider,
      //   invoice.id,
      //   grandTotal,
      // );
      return {
        paymentMethodId: request.paymentMethodId,
        invoiceId: invoice.id,
        grandTotal: grandTotal,
        qrImage: integration?.image || null,
      };
    }

    // get opened cash drawer
    const cashDrawer = await this._cashDrawer.getCashDrawerStatus(storeId);
    if (cashDrawer?.status === cash_drawer_type.close) {
      this.logger.error(`Cash Drawer with store id ${storeId} is closed`);
      throw new NotFoundException(
        `Cash Drawer with store id ${storeId} is closed`,
      );
    }

    // Skip if cashDrawerId is undefined or null
    if (cashDrawer) {
      // add cash drawer transaction
      await this._cashDrawer.addCashDrawerTransaction(
        cashDrawer?.id,
        paymentAmount,
        changeAmount,
        2,
        '', // notes still empty
        header.user?.id,
      );
    }

    // Create stock adjustments for completed payment
    await this.createStockAdjustmentsForInvoice(invoice.id, storeId);
    return {
      paymentMethodId: request.paymentMethodId,
      invoiceId: invoice.id,
      grandTotal: grandTotal,
    };
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

    // Create stock adjustments if payment is successful
    if (status === invoice_type.paid) {
      await this.createStockAdjustmentsForInvoice(order_id, invoice.store_id!);
    }

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
    this._notificationHelper.notifyPaymentSuccess(requestCallback.order_id);

    // Create stock adjustments if payment is successful
    if (status === invoice_type.paid) {
      await this.createStockAdjustmentsForInvoice(
        requestCallback.order_id,
        invoice.store_id!,
      );
    }

    return {
      success: true,
      message: `Payment status updated for order ${requestCallback.order_id}`,
      data: paymentStatus,
    };
  }

  public async calculateTotal(
    tx: Prisma.TransactionClient,
    request: CalculationEstimationDto,
    storeId?: string,
    invoiceId?: string,
  ): Promise<CalculationResult> {
    let total = 0;
    let discountTotal = 0;
    let taxAmount = 0;
    let taxType = false;
    let serviceAmount = 0;
    let serviceType = false;
    let taxId = '';
    let serviceChargeId = '';
    let paymentAmount = 0;
    let changeAmount = 0;
    let totalPointsEarn = 0;
    let totalRedeemDiscount = 0;
    const items = [];

    for (const item of request.products) {
      if (item.type === 'single') {
        const product = await this._prisma.products.findUnique({
          where: { id: item.productId },
          select: { price: true, discount_price: true },
        });

        if (!product) {
          this.logger.error(`Product with ID ${item.productId} not found`);
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
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

        const discountAmount =
          (originalPrice - discountedPrice) * item.quantity;
        const lineTotal = (originalPrice + variantPrice) * item.quantity;
        discountTotal += discountAmount;
        total += lineTotal;

        items.push({
          type: 'single' as const,
          productId: item.productId,
          variantId: item.variantId,
          bundlingId: null,
          productPrice,
          originalPrice,
          variantPrice,
          qty: item.quantity,
          discountAmount: discountAmount,
          subtotal: lineTotal,
        });
      } else if (item.type === 'bundling') {
        const bundling = await this._prisma.catalog_bundling.findUnique({
          where: { id: item.bundlingId },
          select: { 
            name: true, 
            price: true, 
            discount: true,
            catalog_bundling_has_product: {
              select: {
                quantity: true,
                products: {
                  select: {
                    price: true
                  }
                }
              }
            }
          },
        });

        if (!bundling) {
          this.logger.error(`Bundling data not found in request for item.`);
          throw new BadRequestException(`Bundling data not found in request`);
        }

        const totalBundlingOrigin = bundling.catalog_bundling_has_product.reduce((acc, bp) => {
          const qty = bp.quantity ?? 1;
          const price = bp.products?.price ?? 0;
          return acc + qty * price;
        }, 0);
        const totalDiscountBundling = totalBundlingOrigin - (bundling.price ?? 0);
        discountTotal += totalDiscountBundling;

        items.push({
          type: 'bundling' as const,
          productId: null,
          variantId: null,
          bundlingId: item.bundlingId ?? null,
          name: bundling.name,
          productPrice: bundling.price ?? 0,
          variantPrice: 0,
          qty: item.quantity,
          subtotal: (bundling.price ?? 0) * item.quantity,
          discountAmount: totalDiscountBundling,
        });

        total += totalBundlingOrigin * item.quantity;
      } else {
        this.logger.error(`Invalid product type ${item.type}`);
        throw new NotFoundException(`Invalid product type ${item.type}`);
      }
    }

    // harga sebelum potongan voucher
    const subTotal = total;

    // --- apply voucher

    let voucherAmount = 0;
    if (request?.voucherId) {
      const productIds = request.products
        .filter((p) => p.type === 'single')
        .map((p) => p.productId);

      const voucherCalculation = await this._voucherService.voucherCalculation(
        // voucher id
        request.voucherId,
        // product ids
        productIds,
        // grand total
        total,
        // biar tidak ngitung max quota
        true,
      );

      // set voucher amount
      voucherAmount = voucherCalculation.voucherAmount;
    }

    // --- end apply voucher

    // Update total calculation: subTotal - discountTotal - voucherAmount
    total = subTotal - discountTotal - voucherAmount;

    // applied tax and service
    // bacause tax and service only set one term, this part
    // might be need to be change if the business change
    // get service
    let grandTotal = total;
    const serviceCharge = await this._charge.getChargeByType(
      charge_type.service,
      storeId!,
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
          serviceAmount = subTotal - subTotal / (1 + percentage);
        } else {
          // If service exclude, count service as an additional
          serviceAmount = subTotal * percentage;
          grandTotal += serviceAmount;
        }

        serviceType = serviceCharge.is_include;
        serviceChargeId = serviceCharge.id;

        // upsert data service charge into invoice charge
        if (invoiceId !== null && invoiceId !== undefined) {
          const invoiceCharge = {
            invoice_id: invoiceId!,
            charge_id: serviceCharge.id,
            percentage: serviceCharge.percentage,
            amount: new Prisma.Decimal(serviceAmount),
            is_include: serviceType,
          };
          await this.upsertInvoiceCharge(tx, invoiceCharge);
        }
      }
    }

    // get tax
    const tax = await this._charge.getChargeByType(charge_type.tax, storeId!);
    if (tax?.is_enabled) {
      const taxApplicable = tax.applied_to_takeaway ? true : !isTakeaway;
      const percentage = Number(tax.percentage);

      if (taxApplicable) {
        // Base tax counting
        let taxBase = subTotal;

        // If service charge exclude, then tax counted as subTotal + service
        if (!serviceType) {
          taxBase += serviceAmount;
        }
        // if Tax is always calculated from the subTotal (before voucher deduction)
        // const taxBase = subTotal;

        if (tax.is_include) {
          // If tax include, count tax portion has included in taxBase
          taxAmount = taxBase - taxBase / (1 + percentage);
        } else {
          // If tax exclude, tax counted as additional
          taxAmount = taxBase * percentage;
          grandTotal += taxAmount;
        }

        taxType = tax.is_include;
        taxId = tax.id;

        // upsert data service charge into invoice charge
        if (invoiceId !== null && invoiceId !== undefined) {
          const invoiceCharge = {
            invoice_id: invoiceId!,
            charge_id: tax.id,
            percentage: tax.percentage,
            amount: new Prisma.Decimal(taxAmount),
            is_include: taxType,
          };
          await this.upsertInvoiceCharge(tx, invoiceCharge);
        }
      }
    }

    // note: Calculate change_amount and payment_amount
    if (request.paymentAmount && request.provider == 'cash') {
      paymentAmount = request.paymentAmount;
      if (paymentAmount < grandTotal) {
        this.logger.error(`Payment amount is less than grand total`);
        throw new BadRequestException(
          `Payment amount is less than grand total`,
        );
      }
      changeAmount = paymentAmount - grandTotal;
    } else {
      paymentAmount = grandTotal;
    }

    // Apply payment rounding if store ID is provided
    let roundingAdjustment = 0;
    let paymentRoundingSetting = null;

    if (storeId) {
      const setting = await tx.payment_rounding_settings.findFirst({
        where: {
          store_id: storeId,
          is_enabled: true,
        },
      });

      if (setting) {
        const roundingValue = setting.rounding_value;
        const remainder = grandTotal % roundingValue;

        if (remainder !== 0) {
          if (setting.rounding_type === 'up') {
            // Round up: add remainder to reach target
            roundingAdjustment = roundingValue - remainder;
          } else if (setting.rounding_type === 'down') {
            // Round down: subtract remainder
            roundingAdjustment = -remainder;
          }

          // Apply rounding adjustment to grand total
          grandTotal += roundingAdjustment;

          // Update payment amount if it was equal to original grandTotal
          if (paymentAmount === grandTotal - roundingAdjustment) {
            paymentAmount = grandTotal;
            changeAmount = paymentAmount - grandTotal;
          }
        }

        paymentRoundingSetting = {
          id: setting.id,
          roundingType: setting.rounding_type,
          roundingValue: setting.rounding_value,
          isEnabled: setting.is_enabled,
        };
      }
    }

    // Calculate total points
    if (request.customerId && storeId) {
      const getPoints = await this.calculateLoyaltyPoints(
        storeId,
        request.products,
        grandTotal,
        null,
      );
      totalPointsEarn =
        getPoints.earnPointsBySpend + getPoints.earnPointsByProduct;

      if (request.redeemLoyalty) {
        const benefit = await this._prisma.loyalty_points_benefit.findFirst({
          where: {
            id: request.redeemLoyalty.loyalty_points_benefit_id,
          },
        });

        if (benefit && benefit.type == 'discount') {
          const discountValue = benefit.discount_value ?? 0;
          const isPercent = benefit.is_percent ?? false;

          if (isPercent) {
            totalRedeemDiscount = grandTotal * (discountValue / 100);
          } else {
            totalRedeemDiscount = discountValue;
          }

          if (totalRedeemDiscount > grandTotal) {
            totalRedeemDiscount = grandTotal;
          }

          grandTotal -= totalRedeemDiscount;
        }
      }
    }

    return {
      subTotal,
      discountTotal,
      voucherAmount,
      total,
      tax: taxAmount,
      serviceCharge: serviceAmount,
      grandTotal,
      taxId: taxId,
      taxInclude: taxType,
      serviceChargeId: serviceChargeId,
      serviceChargeInclude: serviceType,
      paymentAmount,
      changeAmount,
      items,
      roundingAdjustment,
      paymentRoundingSetting,
      totalPointsEarn,
      totalRedeemDiscount,
    };
  }

  private async validatePaymentMethod(methodId: string, provider: string) {
    const paymentMethod = await this._prisma.payment_methods.findFirst({
      where: {
        id: methodId,
      },
    });

    if (!paymentMethod) {
      this.logger.error(
        `Unsupported payment method: ${methodId} with payment name ${provider}`,
      );
      throw new BadRequestException(
        `Unsupported payment method: ${methodId} with payment name ${provider}`,
      );
    }

    return paymentMethod;
  }

  // Private function section
  private async initiatePaymentBasedOnMethod(
    methodId: string,
    provider: PaymentGateway | undefined,
    orderId: string,
    amount: number,
  ): Promise<any> {
    // find payment method
    const paymentMethod = await this._prisma.payment_methods.findUnique({
      where: { id: methodId },
    });

    // If provider is undefined, assume cash and skip gateway initiation
    if (!provider) {
      return {
        paymentMethodId: methodId,
        invoiceId: orderId,
        amount,
        message: 'Cash payment does not require gateway initiation',
      };
    }
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
    const variantLinks = await this._prisma.variant_has_products.findMany({
      where: { products_id: productId },
      select: { variant_id: true },
    });

    const variantIds = variantLinks.map((v) => v.variant_id);

    // If product doesn't have variant
    if (variantIds.length === 0) {
      if (variantId) {
        this.logger.warn(
          `Product ${productId} does not support variants, but variant ${variantId} was provided.`,
        );
        throw new BadRequestException(
          `Product ${productId} does not support variants.`,
        );
      }
      return null;
    }

    // if product has variant but variantId not sent
    if (!variantId || variantId === '') {
      return null;
    }

    // if varint has sent, check if is valid
    if (!variantIds.includes(variantId)) {
      this.logger.error(
        `Variant ${variantId} is not valid for product ${productId}.`,
      );
      throw new BadRequestException(
        `Variant ${variantId} is not valid for product ${productId}.`,
      );
    }

    return variantId;
  }

  private async upsertInvoiceCharge(
    tx: Prisma.TransactionClient,
    request: invoice_charges,
  ) {
    // update insert data of invoice charge
    const invoiceCharge = await this.getInvoiceChargeById(
      tx,
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

      return await this.createInvoiceCharge(tx, invoiceChargeData);
    } else {
      // if tax or service exist update
      invoiceCharge.percentage = request.percentage;
      invoiceCharge.amount = request.amount;

      await this.updateInvoiceCharge(tx, invoiceCharge);
      return invoiceCharge;
    }
  }

  /**
   * Create stock adjustments for invoice items when payment is successful
   */
  private async createStockAdjustmentsForInvoice(
    invoiceId: string,
    storeId: string,
  ): Promise<void> {
    try {
      // Check if store is retail type
      const store = await this._prisma.stores.findUnique({
        where: { id: storeId },
        select: { business_type: true },
      });

      const isRetail = store?.business_type === 'Retail';
      if (!isRetail) {
        // Only process stock adjustments for retail stores
        return;
      }

      // Get invoice details with product information
      const invoiceDetails = await this._prisma.invoice_details.findMany({
        where: { invoice_id: invoiceId },
        include: {
          products: {
            select: {
              master_inventory_item_id: true,
              name: true,
            },
          },
        },
      });

      if (invoiceDetails.length === 0) {
        this.logger.warn(`No invoice details found for invoice ${invoiceId}`);
        return;
      }

      // Process each invoice detail item
      for (const detail of invoiceDetails) {
        if (!detail.products?.master_inventory_item_id) {
          this.logger.warn(
            `Product ${detail.product_id} does not have master_inventory_item_id, skipping stock adjustment`,
          );
          continue;
        }

        const masterInventoryItemId = detail.products.master_inventory_item_id;
        const quantity = detail.qty || 0;

        if (quantity <= 0) {
          this.logger.warn(
            `Invalid quantity ${quantity} for product ${detail.product_id}, skipping stock adjustment`,
          );
          continue;
        }

        // Get current inventory item to check stock
        const inventoryItem =
          await this._prisma.master_inventory_items.findUnique({
            where: { id: masterInventoryItemId },
            select: { stock_quantity: true, name: true },
          });

        if (!inventoryItem) {
          this.logger.warn(
            `Inventory item ${masterInventoryItemId} not found, skipping stock adjustment`,
          );
          continue;
        }

        const currentStock = inventoryItem.stock_quantity;
        const newStock = currentStock - quantity;

        if (newStock < 0) {
          this.logger.warn(
            `Insufficient stock for item ${inventoryItem.name}. Current: ${currentStock}, Required: ${quantity}. Creating adjustment anyway.`,
          );
        }

        // Create stock adjustment and update inventory in transaction
        await this._prisma.$transaction(async (tx) => {
          // Update inventory item stock quantity
          await tx.master_inventory_items.update({
            where: { id: masterInventoryItemId },
            data: {
              stock_quantity: newStock,
              updated_at: new Date(),
            },
          });

          // Create stock adjustment record
          await tx.inventory_stock_adjustments.create({
            data: {
              master_inventory_items_id: masterInventoryItemId,
              stores_id: storeId,
              action: 'STOCK_OUT',
              adjustment_quantity: quantity,
              notes: 'Stock deduction from completed order/invoice checkout',
              previous_quantity: currentStock,
              new_quantity: newStock,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        });

        this.logger.log(
          `Stock adjustment created for item ${inventoryItem.name}: ${currentStock} -> ${newStock} (${quantity} units deducted)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create stock adjustments for invoice ${invoiceId}:`,
        error,
      );
      // Don't throw error to avoid disrupting payment flow
    }
  }

  private async calculateLoyaltyPoints(
    storeId: string,
    products: any = [],
    grandTotal: number,
    redeemLoyalty: RedeemLoyaltyDto | null,
  ) {
    let earnPointsBySpend = 0;
    let earnPointsByProduct = 0;
    let descriptionBySpend = '';
    let descriptionByProduct = '';
    let description = '';

    const loyaltySettings = await this._prisma.loyalty_point_settings.findFirst(
      {
        where: { storesId: storeId },
      },
    );

    if (loyaltySettings) {
      // Calculate points if spend based is enabled
      if (loyaltySettings.spend_based) {
        const minTrans = loyaltySettings.minimum_transaction ?? 0;
        const pointsPerTrans = loyaltySettings.points_per_transaction ?? 0;
        const getPointsOnSpendBaseRedemption =
          loyaltySettings.spend_based_get_points_on_redemption ?? false;
        const canEarnPoints =
          !redeemLoyalty || (redeemLoyalty && getPointsOnSpendBaseRedemption);

        if (canEarnPoints && grandTotal >= minTrans) {
          if (loyaltySettings.spend_based_points_apply_multiple) {
            const multiplier = Math.floor(grandTotal / minTrans);
            earnPointsBySpend += multiplier * pointsPerTrans;
          } else {
            earnPointsBySpend += pointsPerTrans;
          }

          descriptionBySpend =
            earnPointsBySpend > 0
              ? 'Earned from based spend = ' + earnPointsBySpend
              : '';
        }
      }

      // Calculate points if product based is enabled
      if (loyaltySettings.product_based) {
        const getPointsOnProductBaseRedemption =
          loyaltySettings.product_based_get_points_on_redemption ?? false;
        const canEarnPoints =
          !redeemLoyalty || (redeemLoyalty && getPointsOnProductBaseRedemption);

        if (canEarnPoints) {
          for (const product of products) {
            if (product.type == 'single') {
              const loyaltyItem =
                await this._prisma.loyalty_product_item.findFirst({
                  where: {
                    loyalty_point_setting_id: loyaltySettings.id,
                    product_id: product.productId,
                  },
                });

              if (loyaltyItem) {
                const qty = product.quantity ?? 0;
                const minimumPurchase = loyaltyItem.minimum_transaction ?? 0;

                if (qty >= minimumPurchase) {
                  if (loyaltySettings.product_based_points_apply_multiple) {
                    const multiplierProduct = Math.floor(qty / minimumPurchase);
                    earnPointsByProduct +=
                      multiplierProduct * (loyaltyItem.points ?? 0);
                  } else {
                    earnPointsByProduct += loyaltyItem.points ?? 0;
                  }
                }
              }
            }
          }

          descriptionByProduct =
            earnPointsByProduct > 0
              ? 'Earned from product spend = ' + earnPointsByProduct
              : '';
        }
      }

      if (earnPointsBySpend > 0 || earnPointsByProduct > 0) {
        let descriptionParts: string[] = [];

        if (descriptionBySpend) {
          descriptionParts.push(descriptionBySpend);
        }

        if (descriptionByProduct) {
          descriptionParts.push(descriptionByProduct);
        }

        description = descriptionParts.join(' and ');
      }
    }

    return {
      earnPointsBySpend,
      earnPointsByProduct,
      description,
    };
  }

  private async updateCustomerPoint(customerId: string) {
    const [earnAndAdjustment, redeem] = await Promise.all([
      this._prisma.customer_loyalty_transactions.aggregate({
        where: {
          customer_id: customerId,
          type: { in: ['earn', 'adjustment'] },
        },
        _sum: { points: true },
      }),
      this._prisma.customer_loyalty_transactions.aggregate({
        where: { customer_id: customerId, type: 'redeem' },
        _sum: { points: true },
      }),
    ]);

    const totalActivePoints =
      (earnAndAdjustment._sum.points ?? 0) - (redeem._sum.points ?? 0);

    await this._prisma.customer.update({
      where: { id: customerId },
      data: { point: totalActivePoints },
    });

    return totalActivePoints;
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
  public async create(
    tx: Prisma.TransactionClient,
    invoice: invoice,
  ): Promise<invoice> {
    try {
      const result = await tx.invoice.create({
        data: {
          id: invoice.id,
          payment_methods_id: invoice.payment_methods_id,
          customer_id: invoice.customer_id,
          table_code: invoice.table_code,
          payment_status: invoice.payment_status as invoice_type,
          discount_amount: invoice.discount_amount,
          subtotal: invoice.subtotal, // harga sebelum potongan voucher
          order_type: invoice.order_type,
          created_at: invoice.created_at ?? new Date(),
          update_at: invoice.update_at ?? new Date(),
          delete_at: invoice.delete_at ?? null,
          paid_at: invoice.paid_at ?? null,
          tax_id: invoice.tax_id ?? null,
          service_charge_id: invoice.service_charge_id ?? null,
          tax_amount: invoice.tax_amount ?? 0,
          service_charge_amount: invoice.service_charge_amount ?? 0,
          grand_total: invoice.grand_total ?? 0,
          payment_amount: invoice.payment_amount ?? 0,
          change_amount: invoice.change_amount ?? 0,
          cashier_id: invoice.cashier_id,
          invoice_number: invoice.invoice_number,
          order_status: invoice.order_status,
          store_id: invoice.store_id,
          complete_order_at: invoice.complete_order_at,
          // apply voucher
          voucher_id: invoice.voucher_id ?? null,
          voucher_amount: invoice.voucher_amount ?? 0,
          // product discount
          total_product_discount: invoice.total_product_discount ?? 0,
          // payment rounding
          rounding_setting_id: invoice.rounding_setting_id ?? null,
          rounding_amount: invoice.rounding_amount ?? null,
        },
      });

      // jika ada voucher, kurangi quota voucher
      if (result.voucher_id) {
        await this._voucherService.decreaseQuota(tx, result.voucher_id);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to create invoice');
      throw new BadRequestException('Failed to create invoice', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async update(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    data: InvoiceUpdateDto,
  ) {
    try {
      const {
        tax_id,
        service_charge_id,
        customer_id,
        payment_method_id,
        voucher_id,
        rounding_setting_id,
        ...rest
      } = data;

      const updateData: any = {
        ...rest,
        update_at: new Date(),
      };

      if (tax_id) {
        updateData.charges_invoice_tax_idTocharges = {
          connect: { id: tax_id },
        };
      }

      if (service_charge_id) {
        updateData.charges_invoice_service_charge_idTocharges = {
          connect: { id: service_charge_id },
        };
      }

      if (customer_id) {
        updateData.customer = {
          connect: { id: customer_id },
        };
      }

      if (payment_method_id) {
        updateData.payment_methods = {
          connect: { id: payment_method_id },
        };
      }

      if (voucher_id) {
        updateData.voucher = {
          connect: { id: voucher_id },
        };
      }

      if (rounding_setting_id) {
        updateData.payment_rounding_settings = {
          connect: { id: rounding_setting_id },
        };
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: updateData,
      });
    } catch (error) {
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
    tx: Prisma.TransactionClient,
    invoiceDetail: invoice_details,
  ): Promise<invoice_details> {
    try {
      return await tx.invoice_details.create({
        data: {
          id: invoiceDetail.id,
          invoice_id: invoiceDetail.invoice_id,
          product_id: invoiceDetail.product_id ?? null,
          catalog_bundling_id: invoiceDetail.catalog_bundling_id ?? null,
          product_price: invoiceDetail.product_price,
          variant_price: invoiceDetail.variant_price,
          notes: invoiceDetail.notes,
          qty: invoiceDetail.qty,
          variant_id:
            invoiceDetail.variant_id === '' ? null : invoiceDetail.variant_id,
          product_discount: invoiceDetail.product_discount ?? 0,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create invoice detail');
      throw new BadRequestException('Failed to create invoice detail', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async upsertInvoiceDetail(
    tx: Prisma.TransactionClient,
    data: {
      qty: number;
      notes?: string | null;
      productTotal: number;
      variantTotal: number;
    },
    where: {
      invoice_id: string;
      product_id: string;
      variant_id: string;
    },
  ): Promise<invoice_details> {
    try {
      const variantId =
        where.variant_id === '' || !where.variant_id ? null : where.variant_id;

      const existing = await tx.invoice_details.findFirst({
        where: {
          invoice_id: where.invoice_id,
          product_id: where.product_id,
          variant_id: variantId,
        },
      });

      if (existing) {
        this.logger.log(
          `Invoice detail already exists for invoice_id=${where.invoice_id}, product_id=${where.product_id}, variant_id=${variantId}`,
        );

        return existing;
      }

      const invoiceId = uuidv4();
      const newDataInvoiceDetails = {
        id: invoiceId,
        invoice_id: where.invoice_id,
        variant_id: variantId,
        qty: data.qty,
        notes: data.notes ?? null,
        product_price: data.productTotal,
        variant_price: data.variantTotal,
      };

      return await tx.invoice_details.create({
        data: newDataInvoiceDetails,
      });
    } catch (error) {
      this.logger.error('Failed to upsert invoice detail', error.message);
      throw new BadRequestException('Failed to upsert invoice detail', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Create an invoice charge
   */
  public async createInvoiceCharge(
    tx: Prisma.TransactionClient,
    invoiceCharge: invoice_charges,
  ): Promise<invoice_charges> {
    try {
      return await tx.invoice_charges.create({
        data: {
          invoice_id: invoiceCharge.invoice_id,
          charge_id: invoiceCharge.charge_id,
          percentage: invoiceCharge.percentage,
          amount: invoiceCharge.amount,
          is_include: invoiceCharge.is_include,
        },
      });
    } catch (error) {
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
    tx: Prisma.TransactionClient,
    invoiceCharge: invoice_charges,
  ): Promise<number> {
    try {
      const result = await tx.invoice_charges.updateMany({
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
  public async getInvoiceChargeById(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    chargeId: string,
  ) {
    try {
      return await tx.invoice_charges.findFirst({
        where: { invoice_id: invoiceId, charge_id: chargeId },
      });
    } catch (error) {
      this.logger.error('Failed to fetch invoice charge');
      throw new BadRequestException('Failed to fetch invoice charge', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async getInvoiceSetting(req: GetInvoiceSettingDto, userId: number) {
    try {
      const response = await this._prisma.invoice_settings.findMany({
        where: {
          store_id: req.storeId,
          uid: userId,
        },
        include: {
          stores: true,
        },
      });

      return toCamelCase(response);
    } catch (error) {
      throw new BadRequestException('Failed to fetch invoice settings', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async updateInvoiceSetting(body: SettingInvoiceDto) {
    try {
      const response = await this._prisma.invoice_settings.upsert({
        where: { store_id: body.storeId },
        update: {
          company_logo_url: body.companyLogo,
          footer_text: body.footerText,
          is_automatically_print_receipt: body.isAutomaticallyPrintReceipt,
          is_automatically_print_kitchen: body.isAutomaticallyPrintKitchen,
          is_automatically_print_table: body.isAutomaticallyPrintTable,
          is_show_company_logo: body.isShowCompanyLogo,
          is_show_store_location: body.isShowStoreLocation,
          is_hide_cashier_name: body.isHideCashierName,
          is_hide_order_type: body.isHideOrderType,
          is_hide_queue_number: body.isHideQueueNumber,
          is_show_table_number: body.isShowTableNumber,
          is_hide_item_prices: body.isHideItemPrices,
          is_show_footer: body.isShowFooter,
          increment_by: body.incrementBy,
          reset_sequence: body.resetSequence,
          starting_number: body.startingNumber,
        },
        create: {
          store_id: body.storeId,
          company_logo_url: body.companyLogo,
          footer_text: body.footerText,
          is_automatically_print_receipt: body.isAutomaticallyPrintReceipt,
          is_automatically_print_kitchen: body.isAutomaticallyPrintKitchen,
          is_automatically_print_table: body.isAutomaticallyPrintTable,
          is_show_company_logo: body.isShowCompanyLogo,
          is_show_store_location: body.isShowStoreLocation,
          is_hide_cashier_name: body.isHideCashierName,
          is_hide_order_type: body.isHideOrderType,
          is_hide_queue_number: body.isHideQueueNumber,
          is_show_table_number: body.isShowTableNumber,
          is_hide_item_prices: body.isHideItemPrices,
          is_show_footer: body.isShowFooter,
          increment_by: body.incrementBy,
          reset_sequence: body.resetSequence,
          starting_number: body.startingNumber,
        },
      });

      return toCamelCase(response);
    } catch (error) {
      throw new BadRequestException('Failed to update invoice settings');
    }
  }

  /**
   * @description Get invoice charge data
   */
  public async createCustomerInvoice(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    customerId: string,
  ) {
    try {
      return await tx.customers_has_invoices.create({
        data: {
          invoices_id: invoiceId,
          customers_id: customerId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create customer has invoice');
      throw new BadRequestException('Failed to create customer has invoice', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Create default invoice settings for a store
   */
  public async createDefaultInvoiceSettings(
    storeId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const prisma = tx || this._prisma;

    const existingSetting = await prisma.invoice_settings.findUnique({
      where: { store_id: storeId },
    });

    if (!existingSetting) {
      await prisma.invoice_settings.create({
        data: {
          store_id: storeId,
          uid: null,
          company_logo_url: null,
          footer_text: 'footer text',
          is_automatically_print_receipt: true,
          is_automatically_print_kitchen: false,
          is_automatically_print_table: false,
          is_show_company_logo: true,
          is_show_store_location: true,
          is_hide_cashier_name: false,
          is_hide_order_type: false,
          is_hide_queue_number: false,
          is_show_table_number: true,
          is_hide_item_prices: false,
          is_show_footer: true,
          increment_by: 1,
          reset_sequence: 'Daily',
          starting_number: 1,
        },
      });
    }
  }

  // End of query section
}
