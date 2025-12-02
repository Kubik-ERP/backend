import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { ProductsModule } from '../products/products.module';
import { WasteLogController } from './controllers/waste-log.controller';
import { WasteLogService } from './services/waste-log.service';

@Module({
  imports: [PrismaModule, StorageServiceModule, ProductsModule],
  controllers: [WasteLogController],
  providers: [WasteLogService],
  exports: [WasteLogService],
})
export class WasteLogModule {}
