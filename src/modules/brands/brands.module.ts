import { Module } from '@nestjs/common';
import { BrandsController } from './controllers/brands.controller';
import { BrandsService } from './services/brands.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [BrandsService, Reflector],
  exports: [BrandsService],
})
export class BrandsModule {}
