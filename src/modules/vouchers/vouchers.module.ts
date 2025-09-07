import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VouchersService } from './vouchers.service';
import { VouchersController } from './vouchers.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VouchersController],
  providers: [VouchersService, Reflector],
})
export class VouchersModule {}
