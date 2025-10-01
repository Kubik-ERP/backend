import { Module } from '@nestjs/common';
import { PaymentRoundingSettingController } from './controllers/payment-rounding-setting.controller';
import { PaymentRoundingSettingService } from './services/payment-rounding-setting.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentRoundingSettingController],
  providers: [PaymentRoundingSettingService],
  exports: [PaymentRoundingSettingService],
})
export class PaymentRoundingSettingModule {}
