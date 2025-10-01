import { Module } from '@nestjs/common';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [StorageServiceModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
