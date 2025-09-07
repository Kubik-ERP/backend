import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { Reflector } from '@nestjs/core';

@Module({
  providers: [PaymentMethodService, PrismaService, Reflector],
  controllers: [PaymentMethodController],
  exports: [PaymentMethodService, PrismaService],
})
export class PaymentMethodModule {}
