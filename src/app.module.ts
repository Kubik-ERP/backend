// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { CustomLogger } from './common/logger/custom.logger';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentMethodModule } from './modules/payment-methods/payment-method.module';
import { TemplatesEmailModule } from './modules/templates-email/templates-email.module';
import { UsersModule } from './modules/users/users.module';

// NestJS Libraries
import { CacheModule } from '@nestjs/cache-manager';
import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CategoriesModule } from './modules/categories/categories.module';

import KeyvRedis, { createKeyv } from '@keyv/redis';
import Keyv from 'keyv';
import { HeaderMiddleware } from './common/middleware/header-middleware';
import { ServerKeyMiddleware } from './common/middleware/server-middleware';
import { BankModule } from './modules/bank/bank.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CashDrawerModule } from './modules/cash-drawer/cash-drawer.module';
import { ChargesModule } from './modules/charges/charges.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { InventoryCategoryModule } from './modules/inventory-category/inventory-category.module';
import { InventoryItemsModule } from './modules/inventory-items/inventory-items.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { LoyaltySettingsModule } from './modules/loyalty-settings/loyalty-settings.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProductBundlingModule } from './modules/product-bundling/product-bundling.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { RolesModule } from './modules/roles/roles.module';
import { SelfOrderModule } from './modules/self-order/self-order.module';
import { StockOpnamesModule } from './modules/stock-opnames/stock-opnames.module';
import { StorageLocationsModule } from './modules/storage-locations/storage-locations.module';
import { StoreTableModule } from './modules/store-table/store-table.module';
import { StoresModule } from './modules/stores/stores.module';
import { SubscriptionController } from './modules/subscription/controllers/subscription.controller';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { TablesModule } from './modules/tables/tables.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { DeviceCodesModule } from './modules/device-codes/device-codes.module';
import { PaymentRoundingSettingModule } from './modules/payment-rounding-setting/payment-rounding-setting.module';
import { WorkingHoursModule } from './modules/working-hours/working-hours.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    // Configuration Modules
    CacheModule.registerAsync({
      useFactory: async () => {
        console.log(process.env.REDIS_CONNECTION);
        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(process.env.REDIS_CONNECTION),
              namespace: undefined,
              useKeyPrefix: false,
            }),
            createKeyv(process.env.REDIS_CONNECTION),
          ],
        };
      },
      isGlobal: true,
    }),
    AppConfigurationModule,
    DatabasePostgresConfigModule,

    // Core Feature Modules
    AuthenticationModule,
    BankModule,
    BrandsModule,
    CashDrawerModule,
    CategoriesModule,
    ChargesModule,
    CustomerModule,
    EmployeesModule,
    InvoicesModule,
    InventoryCategoryModule,
    InventoryItemsModule,
    StorageLocationsModule,
    KitchenModule,
    LoyaltySettingsModule,
    PaymentMethodModule,
    ProductsModule,
    RolesModule,
    StoresModule,
    SuppliersModule,
    UsersModule,
    TablesModule,
    TemplatesEmailModule,
    StoreTableModule,
    VouchersModule,
    SelfOrderModule,
    PurchaseOrdersModule,
    StockOpnamesModule,
    FacilitiesModule,
    ProductBundlingModule,
    PermissionsModule,
    SubscriptionModule,
    DeviceCodesModule,
    PaymentRoundingSettingModule,
    DashboardModule,
    WorkingHoursModule,
    AttendanceModule,
    IntegrationsModule,
  ],
  providers: [
    {
      provide: Logger,
      useClass: CustomLogger,
    },
    CustomLogger,
  ],
  exports: [Logger, CustomLogger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HeaderMiddleware).forRoutes('*');
    consumer.apply(ServerKeyMiddleware).forRoutes(SubscriptionController);
  }
}
