import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { kitchen_queue, order_status, order_type } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { KitchenQueueAdd, KitchenQueueWithRelations } from '../dtos/queue.dto';
import { GetInvoiceDto } from '../dtos/kitchen.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(private readonly _prisma: PrismaService) {}

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
    const storeId = header.store_id ?? '';

    if (!storeId || typeof storeId !== 'string' || !isUUID(storeId)) {
      throw new BadRequestException('X-STORE-ID header must be a valid UUID');
    }

    const orderStatus: order_status[] = [
      order_status.placed,
      order_status.in_progress,
    ];

    // get value of kitchen queue by store id
    const queues: KitchenQueueWithRelations[] =
      await this.getKitchenQueueByStoreId(storeId, orderStatus);

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
   * @description Create many kitchen queues
   */
  public async getKitchenQueueByStoreId(
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
