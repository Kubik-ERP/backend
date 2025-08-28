import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, PrismaService, Reflector],
})
export class FacilitiesModule {}
