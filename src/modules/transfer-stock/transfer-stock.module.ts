import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { Reflector } from '@nestjs/core';
import { TransferStockController } from './controllers/transfer-stock.controller';
import { TransferStockService } from './services/transfer-stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [TransferStockController],
  providers: [TransferStockService, Reflector],
})

export class TransferStockModule {}