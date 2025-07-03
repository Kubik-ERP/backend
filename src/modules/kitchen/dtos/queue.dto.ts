import { order_status, order_type } from '@prisma/client';

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
