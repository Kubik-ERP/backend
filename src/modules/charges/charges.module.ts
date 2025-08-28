import { Module } from '@nestjs/common';
import { ChargesService } from './services/charges.service';
import { ChargesController } from './controllers/charges.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { Reflector } from '@nestjs/core';

@Module({
  providers: [ChargesService, PrismaService, Reflector],
  controllers: [ChargesController],
  exports: [ChargesService, PrismaService],
})
export class ChargesModule {}
