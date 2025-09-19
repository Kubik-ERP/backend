import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [StorageServiceModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, PrismaService],
})
export class IntegrationsModule {}
