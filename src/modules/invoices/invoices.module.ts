import { forwardRef, Module } from '@nestjs/common';
import { InvoiceService } from './services/invoices.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceController } from './controllers/invoices.controller';
import { PaymentFactory } from './factories/payment.factory';
import { MidtransProvider } from './providers/midtrans.provider';
import { NotificationHelper } from 'src/common/helpers/notification.helper';
import { PaymentLogsService } from '../payment-logs/services/payment-logs.service';
import { MailModule } from '../mail/mail.module';
import { ChargesService } from '../charges/services/charges.service';
import { InvoiceSettingController } from './controllers/invoices-setting.controller';
import { StoresService } from '../stores/services/stores.service';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { TemplatesEmailModule } from '../templates-email/templates-email.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { KitchenService } from '../kitchen/services/kitchen.service';
import { CashDrawerService } from '../cash-drawer/services/cash-drawer.service';
import { VariantsService } from '../variants/variants.service';
import { ProductsService } from '../products/products.service';

@Module({
  imports: [
    MailModule,
    StorageServiceModule,
    KitchenModule,
    forwardRef(() => TemplatesEmailModule),
  ],
  providers: [
    InvoiceService,
    PaymentFactory,
    PrismaService,
    MidtransProvider,
    NotificationHelper,
    PaymentLogsService,
    ChargesService,
    StoresService,
    KitchenService,
    CashDrawerService,
    VariantsService,
    ProductsService,
  ],
  controllers: [InvoiceSettingController, InvoiceController],
  exports: [
    InvoiceService,
    PrismaService,
    NotificationHelper,
    PaymentLogsService,
    ChargesService,
    CashDrawerService,
  ],
})
export class InvoicesModule {}
