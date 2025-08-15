import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { CategoriesModule } from '../categories/categories.module';
import { StoreTableModule } from '../store-table/store-table.module';
import { PaymentMethodModule } from '../payment-methods/payment-method.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { SelfOrderController } from './controllers/self-order.controller';
import { SelfOrderService } from './services/self-order.service';

@Module({
  imports: [
    PrismaModule,
    CustomerModule,
    CategoriesModule,
    StoreTableModule,
    PaymentMethodModule,
    InvoicesModule,
  ],
  controllers: [SelfOrderController],
  providers: [SelfOrderService],
})
export class SelfOrderModule {}
