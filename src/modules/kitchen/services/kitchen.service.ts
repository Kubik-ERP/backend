import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  kitchen_queue,
  order_status,
  order_type,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  KitchenQueueUpdateOrderStatusDto,
  KitchenQueueAdd,
  KitchenQueueWithRelations,
  KitchenBulkQueueUpdateOrderStatusDto,
} from '../dtos/queue.dto';
import { GetInvoiceDto, GetListInvoiceDto } from '../dtos/kitchen.dto';
import { validateStoreId } from 'src/common/helpers/validators.helper';
import { formatDateCommon } from 'src/common/helpers/common.helpers';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async getKitchenQueuesList(
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
      orderStatus,
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
      ...(orderType && {
        order_type: { in: Array.isArray(orderType) ? orderType : [orderType] },
      }),
      ...(orderStatus && {
        order_status: {
          in: Array.isArray(orderStatus) ? orderStatus : [orderStatus],
        },
      }),
      ...(invoiceNumber && { invoice_number: { equals: invoiceNumber } }),
      store_id: storeId,
    };

    const [rawItems, total] = await Promise.all([
      this._prisma.invoice.findMany({
        where: filters,
        select: {
          id: true,
          invoice_number: true,
          created_at: true,
          order_type: true,
          payment_status: true,
          table_code: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          order_status: true,
          complete_order_at: true,
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

    const items = rawItems.map((item) => ({
      invoiceId: item.id,
      orderNumber: item.invoice_number,
      purchaseDate: item.created_at ? formatDateCommon(item.created_at) : '',
      customer: item.customer?.name ?? '',
      tableNumber: item.table_code,
      orderType: item.order_type,
      orderStatus: item.order_status,
      duration: item.complete_order_at,
      createdAt: item.created_at,
      durationFormatted: item?.complete_order_at ?? '',
    }));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  public async createKitchenQueue(
    tx: Prisma.TransactionClient,
    queues: KitchenQueueAdd[],
  ) {
    if (!queues || queues.length === 0) {
      this.logger.warn('No kitchen queues to create');
      return 0;
    }

    const kitchenQueues: kitchen_queue[] = queues.map((queue) => ({
      id: queue.id,
      invoice_id: queue.invoice_id,
      product_id: queue.product_id,
      variant_id: queue.variant_id || null,
      store_id: queue.store_id,
      notes: queue.notes || null,
      order_status: queue.order_status as order_status,
      created_at: queue.created_at ?? new Date(),
      updated_at: queue.updated_at ?? new Date(),
      table_code: queue.table_code || null,
      customer_id: queue.customer_id || null,
      order_type: queue.order_type as order_type,
    }));

    return await this.createMany(tx, kitchenQueues);
  }

  public async ticketByInvoiceId(request: GetInvoiceDto) {
    const invoiceRaw = await this._prisma.invoice.findFirst({
      where: {
        id: request.invoiceId,
      },
      select: {
        id: true,
        created_at: true,
        table_code: true,
        invoice_number: true,
        users: {
          select: { id: true, fullname: true },
        },
        order_type: true,
        customer: {
          select: { id: true, name: true },
        },
        invoice_details: {
          include: {
            products: true,
            variant: true,
          },
        },
      },
    });
    if (!invoiceRaw) {
      this.logger.error(`Invoice with ID ${request.invoiceId} not found.`);
      throw new NotFoundException(
        `Invoice with ID ${request.invoiceId} not found.`,
      );
    }
    function formatDate(date: Date | null): string {
      if (!date) return '';
      const d = new Date(date);
      const pad = (n: number) => n.toString().padStart(2, '0');

      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    const invoice = {
      ...invoiceRaw,
      created_at_formatted: formatDate(invoiceRaw.created_at),
    };

    return invoice;
  }

  public async queueList(header: ICustomRequestHeaders) {
    const storeId = validateStoreId(header.store_id);

    const orderStatus: order_status[] = [
      order_status.placed,
      order_status.in_progress,
      order_status.completed,
    ];

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 1);
    dateFrom.setHours(0, 0, 0, 0);

    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);

    // get value of kitchen queue by store id
    const KitchenQueues: KitchenQueueWithRelations[] =
      await this.findKitchenQueueByStoreId(storeId, orderStatus, {
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

    KitchenQueues.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const groupedResult: any[] = [];
    let lastGroupKey = '';
    let currentGroup: any = null;

    for (const item of KitchenQueues) {
      const groupKey = `${item.invoice_id}-${new Date(item.created_at).getTime()}`;

      if (groupKey !== lastGroupKey) {
        if (currentGroup && currentGroup.queues.length > 0) {
          const allCompleted = currentGroup.queues.every(
            (i: any) => i.product.order_status === order_status.completed,
          );
          if (!allCompleted) {
            groupedResult.push(currentGroup);
          }
        }

        currentGroup = {
          queueReferenceId: item.id, // this is flagging for duration
          invoice_id: item.invoice_id,
          invoice_number: item.invoice?.invoice_number ?? '',
          created_at: item.created_at,
          updated_at: item.updated_at ?? null,
          store_id: item.store_id,
          table_code: item.invoice?.table_code ?? null,
          order_type: item.invoice?.order_type ?? '',
          order_status: item.invoice?.order_status ?? '',
          customer_id: item.invoice?.customer_id ?? null,
          customer_name: item.customer?.name ?? '',
          queues: [],
        };

        lastGroupKey = groupKey;
      }

      currentGroup.queues.push({
        id: item.id,
        product: {
          order_status: item.order_status,
          notes: item.notes ?? '',
          id: item.products?.id ?? '',
          name: item.products?.name ?? '',
          variant: {
            id: item.variant?.id ?? '',
            name: item.variant?.name ?? '',
          },
        },
      });
    }

    if (currentGroup && currentGroup.queues.length > 0) {
      const allCompleted = currentGroup.queues.every(
        (i: any) => i.product.order_status === order_status.completed,
      );
      if (!allCompleted) {
        groupedResult.push(currentGroup);
      }
    }

    return groupedResult;
  }

  public async upadateBulkQueueOrderStatus(
    request: KitchenBulkQueueUpdateOrderStatusDto[],
  ) {
    // mapping the Ids in array
    const ids = request.map((item) => item.queueId);

    // find the existing Ids in DB
    const existingRecords = await this.findManyKitchenQueueByIds(ids);

    // checking the missing Ids
    const existingIds = new Set(existingRecords.map((item) => item.id));
    const missingIds = ids.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      this.logger.error(
        `The following queueIds were not found: ${missingIds.join(', ')}`,
      );
      throw new BadRequestException(
        `The following queueIds were not found: ${missingIds.join(', ')}`,
      );
    }

    // update bulk order status of kitchen queue
    await this.updateManyKitchenQueueOrderStatusByIds(request);

    // fetch the updated value
    const updatedData = await this.findManyKitchenQueueByIds(ids);

    return updatedData;
  }

  public async updateQueueOrderStatus(
    queueId: string,
    request: KitchenQueueUpdateOrderStatusDto,
  ) {
    // check the queue is exist
    const queue = await this.findKitchenQueueById(queueId);

    if (queue === null) {
      this.logger.error('queue not found');
      throw new BadRequestException('queue not found');
    }

    // update queue order status
    const updated = await this.updateQueueById(queueId, {
      order_status: request.orderStatus,
    });

    return updated;
  }

  /**
   * @description Create many kitchen queues
   */
  public async createMany(
    tx: Prisma.TransactionClient,
    kitchenQueues: kitchen_queue[],
  ): Promise<number> {
    try {
      const result = await tx.kitchen_queue.createMany({
        data: kitchenQueues,
      });

      return result.count; // total row inserted
    } catch (error) {
      this.logger.error(`Failed to create many kitchen queues: ${error}`);
      throw new BadRequestException('Failed to create many kitchen queues', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Update kitchen queue by id
   */
  public async updateQueueById(
    id: string,
    data: Prisma.kitchen_queueUpdateInput,
  ) {
    try {
      const updated = await this._prisma.kitchen_queue.update({
        where: { id },
        data,
      });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update kitchen queue');
      throw new BadRequestException('Failed to update kitchen queue', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  public async updateKitchenQueue(
    tx: Prisma.TransactionClient,
    data: {
      notes?: string | null;
    },
    where: {
      invoice_id: string;
      product_variant_id: string;
    },
  ) {
    try {
      // 1️⃣ Cari dulu queue yang match
      const existing = await tx.kitchen_queue.findFirst({
        where: {
          invoice_id: where.invoice_id,
          variant_id: where.product_variant_id,
        },
      });

      if (!existing) {
        throw new BadRequestException(
          `KitchenQueue not found for invoice_id=${where.invoice_id}, variant_id=${where.product_variant_id}`,
        );
      }

      // 2️⃣ Update pakai primary key id (atau composite key sesuai schema)
      return await tx.kitchen_queue.update({
        where: { id: existing.id },
        data: {
          notes: data.notes ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update kitchen queue', error.message);
      throw new BadRequestException('Failed to update kitchen queue', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get kitchen queues by store id
   */
  public async findKitchenQueueByStoreId(
    storeId: string,
    orderStatus: order_status[],
    options?: {
      dateFrom: Date;
      dateTo: Date;
    },
  ): Promise<kitchen_queue[]> {
    try {
      return await this._prisma.kitchen_queue.findMany({
        where: {
          store_id: storeId,
          order_status: { in: orderStatus },
          created_at: {
            ...(options?.dateFrom && { gte: options.dateFrom }),
            ...(options?.dateTo && { lte: options.dateTo }),
          },
        },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          products: {
            select: {
              id: true,
              name: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoice_number: true,
              created_at: true,
              table_code: true,
              order_type: true,
              store_id: true,
              customer_id: true,
              order_status: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });
    } catch (error) {
      this.logger.error('Failed to find kitchen queues');
      throw new BadRequestException('Failed to find kitchen queues', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get kitchen queue by Id
   */
  public async findKitchenQueueById(id: string): Promise<kitchen_queue | null> {
    try {
      return await this._prisma.kitchen_queue.findUnique({
        where: { id: id },
      });
    } catch (error) {
      this.logger.error('Failed to find kitchen queue by Id');
      throw new BadRequestException('Failed to find kitchen queue by Id', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get kitchen queues by Ids
   */
  public async findManyKitchenQueueByIds(
    ids: string[],
  ): Promise<kitchen_queue[]> {
    try {
      const result = await this._prisma.kitchen_queue.findMany({
        where: { id: { in: ids } },
        include: {
          products: {
            select: {
              id: true,
              name: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const normalized = result.map((queue) => ({
        ...queue,
        variant_id: queue.variant_id ?? '',
        notes: queue.notes ?? '',
        variant: queue.variant ?? { id: '', name: '' },
      }));

      return normalized;
    } catch (error) {
      this.logger.error('Failed to create kitchen queues');
      throw new BadRequestException('Failed to create kitchen queues', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get kitchen queue by invoice Id
   */
  public async findKitchenQueueByInvoiceId(
    invoiceId: string,
  ): Promise<kitchen_queue[]> {
    try {
      return await this._prisma.kitchen_queue.findMany({
        where: { invoice_id: invoiceId },
        orderBy: { created_at: 'asc' },
      });
    } catch (error) {
      this.logger.error('Failed to find kitchen queue by invoice Id');
      throw new BadRequestException(
        'Failed to find kitchen queue by invoice Id',
        {
          cause: new Error(),
          description: error.message,
        },
      );
    }
  }

  /**
   * @description Update many order status of kitchen queue by Ids
   */
  public async updateManyKitchenQueueOrderStatusByIds(
    request: KitchenBulkQueueUpdateOrderStatusDto[],
  ) {
    try {
      await Promise.all(
        request.map((item) =>
          this._prisma.kitchen_queue.update({
            where: { id: item.queueId },
            data: {
              order_status: item.orderStatus,
              updated_at: new Date(),
            },
          }),
        ),
      );
    } catch (error) {
      this.logger.error('Failed to update kitchen queues order status');
      throw new BadRequestException(
        'Failed to update kitchen queues order status',
        {
          cause: new Error(),
          description: error.message,
        },
      );
    }
  }
}
