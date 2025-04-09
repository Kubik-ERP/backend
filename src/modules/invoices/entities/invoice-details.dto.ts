// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';
import { invoicetype, ordertype } from '@prisma/client';

export class InvoiceDetailsEntity extends AppBaseEntity {
  @ApiProperty()
  invoice_id: string;

  @ApiProperty()
  product_name: string;

  @ApiProperty()
  product_price: number;

  @ApiProperty()
  product_variant: string;

  @ApiProperty()
  notes: string;

  @ApiProperty()
  order_type: ordertype;

  @ApiProperty()
  qty: number;
}
