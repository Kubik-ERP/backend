import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { CategoriesModule } from '../categories/categories.module';
import { StoreTableModule } from '../store-table/store-table.module';
import { PaymentMethodModule } from '../payment-methods/payment-method.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { SelfOrderController } from './controllers/self-order.controller';
import { SelfOrderService } from './services/self-order.service';
import { ProductsModule } from '../products/products.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { StoresModule } from '../stores/stores.module';
import { ProductBundlingService } from '../product-bundling/product-bundling.service';
import { LoyaltySettingsService } from '../loyalty-settings/loyalty-settings.service';
import { LoyaltyBenefitService } from '../loyalty-settings/loyalty-benefit.service';
import { RolesService } from '../roles/roles.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CustomerService } from '../customer/customer.service';

@Module({
  imports: [
    PrismaModule,
    CustomerModule,
    CategoriesModule,
    StoreTableModule,
    PaymentMethodModule,
    InvoicesModule,
    ProductsModule,
    KitchenModule,
    StoresModule,
  ],
  controllers: [SelfOrderController],
  providers: [
    SelfOrderService,
    ProductBundlingService,
    LoyaltySettingsService,
    LoyaltyBenefitService,
    RolesService,
    VouchersService,
    CustomerService,
  ],
})
export class SelfOrderModule {}
