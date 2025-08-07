import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LoyaltyBenefitController } from './loyalty-benefit.controller';
import { LoyaltyBenefitService } from './loyalty-benefit.service';
import { LoyaltySettingsController } from './loyalty-settings.controller';
import { LoyaltySettingsService } from './loyalty-settings.service';

@Module({
  controllers: [LoyaltySettingsController, LoyaltyBenefitController],
  providers: [LoyaltySettingsService, LoyaltyBenefitService],
  imports: [PrismaModule],
})
export class LoyaltySettingsModule {}
