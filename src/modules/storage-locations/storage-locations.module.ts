import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageLocationsController } from './controllers/storage-locations.controller';
import { StorageLocationsService } from './services/storage-locations.service';

@Module({
  imports: [PrismaModule],
  controllers: [StorageLocationsController],
  providers: [StorageLocationsService],
  exports: [StorageLocationsService],
})
export class StorageLocationsModule {}
