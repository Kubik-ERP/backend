// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// Enum
import { invoice_type } from '@prisma/client';

export class InvoiceEntity extends AppBaseEntity {
  @ApiProperty()
  payment_methods_id: string;

  @ApiProperty()
  customer_id: string;

  @ApiProperty()
  discount_amount: number;

  @ApiProperty()
  table_code: string;

  @ApiProperty()
  payment_status: invoice_type;
}
