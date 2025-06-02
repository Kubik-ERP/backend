import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoices.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceController } from './controllers/invoices.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';
import { NotificationHelper } from 'src/common/helpers/notification.helper';
import { PaymentLogsService } from '../payment-logs/services/payment-logs.service';

@Module({
  providers: [
    InvoiceService,
    PaymentFactory,
    PrismaService,
    MidtransProvider,
    NotificationHelper,
    PaymentLogsService,
  ],
  controllers: [InvoiceController],
  exports: [
    InvoiceService,
    PrismaService,
    NotificationHelper,
    PaymentLogsService,
  ],
})
export class InvoicesModule {}
