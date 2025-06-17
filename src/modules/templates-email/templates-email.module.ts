import { Module } from '@nestjs/common';
import { TemplatesEmailController } from './controllers/templates-email.controller';
import { TemplatesEmailService } from './services/templates-email.service';

import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MailModule, UsersModule],
  controllers: [TemplatesEmailController],
  providers: [TemplatesEmailService],
})
export class TemplatesEmailModule {}
