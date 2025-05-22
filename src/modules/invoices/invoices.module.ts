import { Module } from '@nestjs/common';
import { InvoiceService } from './services/invoices.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceController } from './controllers/invoices.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';

@Module({
  providers: [InvoiceService, PaymentFactory, PrismaService, MidtransProvider],
  controllers: [InvoiceController],
  exports: [InvoiceService, PrismaService],
})
export class InvoicesModule {}
