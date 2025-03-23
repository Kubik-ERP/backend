// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentModule } from './modules/payments/payments.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { CategoriesModule } from './modules/categories/categories.module';

import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // Configuration Modules
    AppConfigurationModule,
    DatabasePostgresConfigModule,

    // Core Feature Modules
    AuthenticationModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    PaymentModule,
  ],
})
export class AppModule {}
