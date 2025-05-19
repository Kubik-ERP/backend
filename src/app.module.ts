// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';
import { InvoicesModule } from './modules/invoices/invoices.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { CategoriesModule } from './modules/categories/categories.module';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';

import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';

@Module({
  imports: [
    // redis
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: redisStore,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        ttl: 300,
      }),
    }),

    // Configuration Modules
    AppConfigurationModule,
    DatabasePostgresConfigModule,

    // Core Feature Modules
    AuthenticationModule,
    UsersModule,
    CategoriesModule,
    InvoicesModule,
    ProductsModule,
    StoresModule,
  ],
})
export class AppModule {}
