import { Module } from '@nestjs/common';
import { ChargesService } from './services/charges.service';
import { ChargesController } from './controllers/charges.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  providers: [ChargesService, Reflector],
  controllers: [ChargesController],
  exports: [ChargesService],
})
export class ChargesModule {}
