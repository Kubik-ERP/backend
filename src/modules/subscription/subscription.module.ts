import { Module } from '@nestjs/common';
import { SubscriptionController } from './controllers/subscription.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SubscriptionService } from './services/subscription.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  imports: [PrismaModule],
})
export class SubscriptionModule {}
