import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
