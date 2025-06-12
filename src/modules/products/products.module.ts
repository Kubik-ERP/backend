import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
