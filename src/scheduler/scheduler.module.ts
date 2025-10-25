import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoyaltyScheduler } from './loyalty/loyalty.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [LoyaltyScheduler, PrismaService],
})
export class SchedulerModule {}
