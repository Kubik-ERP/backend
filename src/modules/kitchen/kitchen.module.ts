import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen.controller';
import { KitchenService } from './services/kitchen.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, PrismaService, Reflector],
  exports: [KitchenService, PrismaService],
})
export class KitchenModule {}
