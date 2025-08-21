import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen.controller';
import { KitchenService } from './services/kitchen.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, PrismaService],
  exports: [KitchenService, PrismaService],
})
export class KitchenModule {}
