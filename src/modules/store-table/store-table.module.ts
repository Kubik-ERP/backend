import { Module } from '@nestjs/common';
import { StoreTableController } from './controllers/store-table.controller';
import { StoreTableService } from './services/store-table.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StoreTableController],
  providers: [StoreTableService],
})
export class StoreTableModule {}
