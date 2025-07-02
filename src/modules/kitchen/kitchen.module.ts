import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen-queue.controller';
import { KitchenService } from './services/kitchen.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, PrismaService],
  exports: [PrismaService],
})
export class KitchenModule {}
