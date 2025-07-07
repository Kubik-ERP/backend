import { ApiProperty } from '@nestjs/swagger';
import { kitchen_queue, order_status, order_type } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class KitchecQueueUpdateOrderStatusDto {
  @ApiProperty({
    description: 'Order status of the kitchen queue',
    required: true,
    example: 'completed',
  })
  @IsEnum(order_status, { each: true })
  orderStatus?: order_status;
}

export class KitchenQueueAdd {
  id: string;
  invoice_id: string;
  product_id: string;
  variant_id?: string;
  store_id: string;
  notes?: string;
  order_status: order_status;
  created_at?: Date;
  updated_at?: Date;
  table_code: string;
  order_type: order_type;
  customer_id: string;
}

// type of grouping queue
export type KitchenQueueWithRelations = kitchen_queue & {
  customer?: { name: string } | null;
  invoice?: {
    invoice_number: string;
    table_code: string | null;
    order_type: string;
    customer_id: string | null;
  } | null;
  products?: { id: string; name: string } | null;
  variant?: { id: string; name: string } | null;
};
