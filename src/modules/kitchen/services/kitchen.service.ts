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
  KitchecQueueUpdateOrderStatusDto,
  KitchenQueueAdd,
  KitchenQueueWithRelations,
} from '../dtos/queue.dto';
import { GetInvoiceDto, GetListInvoiceDto } from '../dtos/kitchen.dto';
import { validateStoreId } from 'src/common/helpers/validators.helper';
import { formatDateCommon } from 'src/common/helpers/common.helpers';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async getKitchenQueuesList(request: GetListInvoiceDto) {
    const {
      page,
      pageSize,
      invoiceNumber,
      createdAtFrom,
      createdAtTo,
      orderType,
      paymentStatus,
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
      ...(invoiceNumber && { invoice_number: { equals: invoiceNumber } }),
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

  public async createKitchenQueue(queues: KitchenQueueAdd[]) {
    if (!queues || queues.length === 0) {
      this.logger.warn('No kitchen queues to create');
      return 0;
    }

    const kitchenQueues: kitchen_queue[] = queues.map((queue) => ({
      id: queue.id,
      invoice_id: queue.invoice_id,
      product_id: queue.product_id,
      variant_id: queue.variant_id ?? '',
      store_id: queue.store_id,
      notes: queue.notes ?? null,
      order_status: queue.order_status as order_status,
      created_at: queue.created_at ?? new Date(),
      updated_at: queue.updated_at ?? new Date(),
      table_code: queue.table_code,
      customer_id: queue.customer_id,
      order_type: queue.order_type as order_type,
    }));

    return await this.createMany(kitchenQueues);
  }

  public async ticketByInvoiceId(request: GetInvoiceDto) {
    const invoiceRaw = await this._prisma.invoice.findFirst({
      where: {
        id: request.invoiceId,
      },
      select: {
        id: true,
        created_at: true,
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
    ];

    // get value of kitchen queue by store id
    const queues: KitchenQueueWithRelations[] =
      await this.findKitchenQueueByStoreId(storeId, orderStatus);

    const grouped: Record<string, any> = {};

    for (const item of queues) {
      const invoice_id = item.invoice_id;

      if (!grouped[invoice_id]) {
        grouped[invoice_id] = {
          id: item.id,
          invoice_id: item.invoice_id,
          invoice_number: item.invoice?.invoice_number ?? '',
          created_at: item.created_at,
          updated_at: item.updated_at,
          store_id: item.store_id,
          table_code: item.invoice?.table_code ?? null,
          order_type: item.invoice?.order_type ?? '',
          customer_id: item.invoice?.customer_id ?? null,
          customer_name: item.customer?.name ?? '',
          items: [],
        };
      }

      grouped[invoice_id].items.push({
        products: {
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

    return Object.values(grouped);
  }

  public async updateQueueOrderStatus(
    queueId: string,
    request: KitchecQueueUpdateOrderStatusDto,
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
  public async createMany(kitchenQueues: kitchen_queue[]): Promise<number> {
    try {
      const result = await this._prisma.kitchen_queue.createMany({
        data: kitchenQueues,
      });

      return result.count; // total row inserted
    } catch (error) {
      this.logger.error('Failed to create kitchen queues');
      throw new BadRequestException('Failed to create kitchen queues', {
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
      this.logger.error('Failed to create kitchen queues');
      throw new BadRequestException('Failed to create kitchen queues', {
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
  ): Promise<kitchen_queue[]> {
    try {
      return await this._prisma.kitchen_queue.findMany({
        where: { store_id: storeId, order_status: { in: orderStatus } },
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
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });
    } catch (error) {
      this.logger.error('Failed to create kitchen queues');
      throw new BadRequestException('Failed to create kitchen queues', {
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
      this.logger.error('Failed to create kitchen queues');
      throw new BadRequestException('Failed to create kitchen queues', {
        cause: new Error(),
        description: error.message,
      });
    }
  }
}
