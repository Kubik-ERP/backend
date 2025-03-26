import { Module } from '@nestjs/common';
import { PaymentService } from './services/payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentController } from './controllers/payments.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';

@Module({
  providers: [PaymentService, PaymentFactory, PrismaService, MidtransProvider],
  controllers: [PaymentController],
  exports: [PaymentService, PrismaService],
})
export class PaymentModule {}
