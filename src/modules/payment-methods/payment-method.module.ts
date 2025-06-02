import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentMethodController } from './controllers/payment-method.controller';

@Module({
  providers: [PaymentMethodService, PrismaService],
  controllers: [PaymentMethodController],
  exports: [PaymentMethodService, PrismaService],
})
export class PaymentMethodModule {}
