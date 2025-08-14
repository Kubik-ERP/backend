import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerModule } from '../customer/customer.module';
import { SelfOrderController } from './controllers/self-order.controller';
import { SelfOrderService } from './services/self-order.service';

@Module({
  imports: [PrismaModule, CustomerModule],
  controllers: [SelfOrderController],
  providers: [SelfOrderService],
})
export class SelfOrderModule {}
