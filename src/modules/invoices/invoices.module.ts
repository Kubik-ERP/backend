import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoices.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceController } from './controllers/invoices.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';
import { NotificationHelper } from 'src/common/helpers/notification.helper';
import { PaymentLogsService } from '../payment-logs/services/payment-logs.service';
import { ChargesService } from '../charges/services/charges.service';
import { InvoiceSettingController } from './controllers/invoices-setting.controller';
import { StoresService } from '../stores/services/stores.service';

@Module({
  providers: [
    InvoiceService,
    PaymentFactory,
    PrismaService,
    MidtransProvider,
    NotificationHelper,
    PaymentLogsService,
    ChargesService,
    StoresService
  ],
  controllers: [InvoiceSettingController, InvoiceController],
  exports: [
    InvoiceService,
    PrismaService,
    NotificationHelper,
    PaymentLogsService,
    ChargesService,
  ],
})
export class InvoicesModule {}
