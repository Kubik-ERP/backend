import { Module } from '@nestjs/common';
import { CashDrawerController } from './controllers/cash-drawer.controller';
import { CashDrawerService } from './services/cash-drawer.service';
import { Prisma } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [CashDrawerController],
  providers: [CashDrawerService, Reflector],
  exports: [],
})
export class CashDrawerModule {}
