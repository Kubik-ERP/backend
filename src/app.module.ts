// Configuration Modules
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';

// NestJS Libraries
import { Module } from '@nestjs/common';

@Module({
  imports: [
    // Configuration Modules
    AppConfigurationModule,
    DatabasePostgresConfigModule,

    // Core Feature Modules
    AuthenticationModule,
    UsersModule,
  ],
})
export class AppModule {}
