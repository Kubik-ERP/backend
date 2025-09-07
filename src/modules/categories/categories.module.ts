import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, Reflector],
  exports: [CategoriesService],
})
export class CategoriesModule {}
