import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService, Reflector],
})
export class FacilitiesModule {}
