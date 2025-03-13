// Module
import { Module } from '@nestjs/common';

// Service
import { MailService } from './services/mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
