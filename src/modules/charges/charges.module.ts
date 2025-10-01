import { Module } from '@nestjs/common';
import { ChargesService } from './services/charges.service';
import { ChargesController } from './controllers/charges.controller';
import { Reflector } from '@nestjs/core';

@Module({
  providers: [ChargesService, Reflector],
  controllers: [ChargesController],
  exports: [ChargesService],
})
export class ChargesModule {}
