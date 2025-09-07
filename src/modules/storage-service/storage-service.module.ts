import { Module } from '@nestjs/common';
import { StorageService } from './services/storage-service.service';

@Module({
  imports: [],
  controllers: [],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageServiceModule {}
