// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentMethodModule } from './modules/payment-methods/payment-method.module';
import { CustomLogger } from './common/logger/custom.logger';
import { TemplatesEmailModule } from './modules/templates-email/templates-email.module';

// NestJS Libraries
import { Logger, Module } from '@nestjs/common';
import { CategoriesModule } from './modules/categories/categories.module';
import { CacheModule } from '@nestjs/cache-manager';

import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';
import KeyvRedis, { createKeyv } from '@keyv/redis';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/roles/roles.module';
import { ShiftModule } from './modules/shift/shift.module';
import Keyv from 'keyv';
import { CustomerModule } from './modules/customer/customer.module';
import { ChargesModule } from './modules/charges/charges.module';
import { CashDrawerModule } from './modules/cash-drawer/cash-drawer.module';
import { TablesModule } from './modules/tables/tables.module';

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
    UsersModule,
    CategoriesModule,
    ChargesModule,
    InvoicesModule,
    CustomerModule,
    PaymentMethodModule,
    ProductsModule,
    StoresModule,
    EmployeesModule,
    RolesModule,
    ShiftModule,
    CashDrawerModule,
    TemplatesEmailModule,
    TablesModule,
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
export class AppModule {}
