import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { CategoriesService } from '../categories/categories.service';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [BankController],
  providers: [BankService, Reflector],
  exports: [BankService],
})
export class BankModule {}
