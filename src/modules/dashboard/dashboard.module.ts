import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { AuthenticationModule } from '../authentication/authentication.module';
import { UsersService } from '../users/services/users.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthenticationModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
