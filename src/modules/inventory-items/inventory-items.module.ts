import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InventoryItemsController } from './controllers/inventory-items.controller';
import { InventoryItemsService } from './services/inventory-items.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService],
  exports: [InventoryItemsService],
})
export class InventoryItemsModule {}
