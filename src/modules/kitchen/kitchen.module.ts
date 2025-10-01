import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen.controller';
import { KitchenService } from './services/kitchen.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [KitchenController],
  providers: [KitchenService, Reflector],
  exports: [KitchenService],
})
export class KitchenModule {}
