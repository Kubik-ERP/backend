import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { Reflector } from '@nestjs/core';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, Reflector],
})
export class FacilitiesModule {}
