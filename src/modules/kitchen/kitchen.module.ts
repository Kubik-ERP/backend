import { Module } from '@nestjs/common';
import { KitchenController } from './controllers/kitchen.controller';
import { KitchenService } from './services/kitchen.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [KitchenController],
  providers: [KitchenService, Reflector],
  exports: [KitchenService],
})
export class KitchenModule {}
