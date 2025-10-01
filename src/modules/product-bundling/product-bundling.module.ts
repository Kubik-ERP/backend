import { Module } from '@nestjs/common';
import { ProductBundlingController } from './product-bundling.controller';
import { ProductBundlingService } from './product-bundling.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [ProductBundlingController],
  providers: [ProductBundlingService, Reflector],
})
export class ProductBundlingModule {}
