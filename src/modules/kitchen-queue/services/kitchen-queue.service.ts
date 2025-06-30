import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { kitchen_queue, order_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { KitchenQueueAdd } from '../dtos/kitchen-queue.dto';

@Injectable()
export class KitchenQueueService {
  private readonly logger = new Logger(KitchenQueueService.name);

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
}
