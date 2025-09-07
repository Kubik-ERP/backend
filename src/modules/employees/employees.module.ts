import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageService } from '../storage-service/services/storage-service.service';
import { StorageServiceModule } from '../storage-service/storage-service.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule, StorageServiceModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, Reflector],
})
export class EmployeesModule {}
