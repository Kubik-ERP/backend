import { Module } from '@nestjs/common';
import { StockOpnamesService } from './stock-opnames.service';
import { StockOpnamesController } from './stock-opnames.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [StockOpnamesController],
  providers: [StockOpnamesService, Reflector],
})
export class StockOpnamesModule {}
