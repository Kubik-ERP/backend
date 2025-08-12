import { Module } from '@nestjs/common';
import { InventoryCategoryController } from './controllers/inventory-category.controller';
import { InventoryCategoryService } from './services/inventory-category.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryCategoryController],
  providers: [InventoryCategoryService],
  exports: [InventoryCategoryService],
})
export class InventoryCategoryModule {}
