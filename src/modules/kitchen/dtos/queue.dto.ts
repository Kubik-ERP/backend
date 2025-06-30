import { order_status } from '@prisma/client';

export class KitchenQueueAdd {
  id: string;
  invoice_id: string;
  product_id: string;
  variant_id?: string;
  notes?: string;
  order_status: order_status;
  created_at?: Date;
  updated_at?: Date;
}
