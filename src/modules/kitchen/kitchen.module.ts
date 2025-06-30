import { Module } from '@nestjs/common';
import { KitchenService } from './services/kitchen.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [KitchenService, PrismaService],
  exports: [PrismaService],
})
export class KitchenMweodules {}
