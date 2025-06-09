import { Module } from '@nestjs/common';
import { CashDrawerController } from './controllers/cash-drawer.controller';
import { CashDrawerService } from './services/cash-drawer.service';
import { Prisma } from '@prisma/client';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CashDrawerController],
    providers: [CashDrawerService],
    exports: [],
})
export class CashDrawerModule { }