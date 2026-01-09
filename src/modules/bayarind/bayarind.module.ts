import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BayarindController } from './bayarind.controller';
import { BayarindService } from './bayarind.service';

@Module({
  imports: [HttpModule],
  controllers: [BayarindController],
  providers: [BayarindService, PrismaService],
})
export class BayarindModule {}
