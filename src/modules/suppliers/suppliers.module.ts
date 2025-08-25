import { Module } from '@nestjs/common';
import { SuppliersController } from './controllers/suppliers.controller';
import { SuppliersService } from './services/suppliers.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, Reflector],
  exports: [SuppliersService],
})
export class SuppliersModule {}
