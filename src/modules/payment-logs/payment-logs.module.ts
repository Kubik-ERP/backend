import { Module } from '@nestjs/common';
import { PaymentLogsService } from './services/payment-logs.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [PaymentLogsService, PrismaService],
  exports: [PaymentLogsService],
})
export class PaymentLogsModule {}
