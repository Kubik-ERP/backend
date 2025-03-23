import { Module } from '@nestjs/common';
import { PaymentService } from './services/payments.service';
import { PaymentController } from './controllers/payments.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';

@Module({
  providers: [PaymentService, PaymentFactory, MidtransProvider],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
