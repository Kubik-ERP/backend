import { Module } from '@nestjs/common';
import { PaymentLogsService } from './services/payment-logs.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PaymentLogsService],
  exports: [PaymentLogsService],
})
export class PaymentLogsModule {}
