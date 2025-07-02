import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { kitchen_queue, order_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { KitchenQueueAdd } from '../dtos/queue.dto';
import { GetInvoiceDto } from '../dtos/kitchen.dto';

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
      notes: queue.notes ?? null,
      order_status: queue.order_status as order_status,
      created_at: queue.created_at ?? new Date(),
      updated_at: queue.updated_at ?? new Date(),
    }));

    return await this.createMany(kitchenQueues);
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
}
