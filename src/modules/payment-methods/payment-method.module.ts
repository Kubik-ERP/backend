import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { PaymentMethodService } from './services/payment-method.service';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  providers: [PaymentMethodService, Reflector],
  controllers: [PaymentMethodController],
  exports: [PaymentMethodService],
})
export class PaymentMethodModule {}
