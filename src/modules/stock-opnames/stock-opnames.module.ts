import { Module } from '@nestjs/common';
import { StockOpnamesService } from './stock-opnames.service';
import { StockOpnamesController } from './stock-opnames.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockOpnamesController],
  providers: [StockOpnamesService],
})
export class StockOpnamesModule {}
