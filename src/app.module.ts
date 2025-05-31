// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentMethodModule } from './modules/payment-method/payment-method.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { CategoriesModule } from './modules/categories/categories.module';
import { CacheModule } from '@nestjs/cache-manager';

import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';
import KeyvRedis, { createKeyv } from '@keyv/redis';
import Keyv from 'keyv';
import { CustomerModule } from './modules/customer/customer.module';

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
    InvoicesModule,
    CustomerModule,
    PaymentMethodModule,
    ProductsModule,
    StoresModule,
  ],
})
export class AppModule {}
