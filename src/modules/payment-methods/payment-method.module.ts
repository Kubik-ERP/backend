import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { PaymentMethodService } from './services/payment-method.service';

@Module({
  imports: [StorageServiceModule],
  providers: [PaymentMethodService, PrismaService, Reflector],
  controllers: [PaymentMethodController],
  exports: [PaymentMethodService, PrismaService],
})
export class PaymentMethodModule {}
