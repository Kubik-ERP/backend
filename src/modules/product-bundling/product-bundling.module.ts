import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductBundlingController } from './product-bundling.controller';
import { ProductBundlingService } from './product-bundling.service';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [ProductBundlingController],
  providers: [ProductBundlingService, Reflector],
})
export class ProductBundlingModule {}
