import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { CategoriesService } from '../categories/categories.service';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [BankController],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule {}
