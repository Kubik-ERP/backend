import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductBundlingController } from './product-bundling.controller';
import { ProductBundlingService } from './product-bundling.service';

@Module({
  controllers: [ProductBundlingController],
  providers: [ProductBundlingService, PrismaService],
})
export class ProductBundlingModule {}
