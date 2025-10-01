import { Module } from '@nestjs/common';
import { PaymentLogsService } from './services/payment-logs.service';

@Module({
  providers: [PaymentLogsService],
  exports: [PaymentLogsService],
})
export class PaymentLogsModule {}
