import { Module } from '@nestjs/common';
import { PaymentRoundingSettingController } from './controllers/payment-rounding-setting.controller';
import { PaymentRoundingSettingService } from './services/payment-rounding-setting.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PaymentRoundingSettingController],
  providers: [PaymentRoundingSettingService, PrismaService],
  exports: [PaymentRoundingSettingService],
})
export class PaymentRoundingSettingModule {}
