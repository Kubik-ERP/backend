import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, Reflector],
})
export class RolesModule {}
