import { Module } from '@nestjs/common';
import { KitchenQueueService } from './services/kitchen-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [KitchenQueueService, PrismaService],
  exports: [PrismaService],
})
export class KitchenQueueModule {}
