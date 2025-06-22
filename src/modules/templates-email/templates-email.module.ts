import { forwardRef, Module } from '@nestjs/common';
import { TemplatesEmailController } from './controllers/templates-email.controller';
import { TemplatesEmailService } from './services/templates-email.service';

import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

import { InvoicesModule } from '../invoices/invoices.module'; // Import InvoicesModule

@Module({
  imports: [MailModule, UsersModule, forwardRef(() => InvoicesModule)],
  controllers: [TemplatesEmailController],
  providers: [TemplatesEmailService],
  exports: [TemplatesEmailService],
})
export class TemplatesEmailModule {}
