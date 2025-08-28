import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductBundlingController } from './product-bundling.controller';
import { ProductBundlingService } from './product-bundling.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [ProductBundlingController],
  providers: [ProductBundlingService, PrismaService, Reflector],
})
export class ProductBundlingModule {}
