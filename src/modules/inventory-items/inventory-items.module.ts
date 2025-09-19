import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { InventoryItemsController } from './controllers/inventory-items.controller';
import { InventoryItemsService } from './services/inventory-items.service';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService, Reflector],
  exports: [InventoryItemsService],
})
export class InventoryItemsModule {}
