import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, PrismaService],
})
export class FacilitiesModule {}
