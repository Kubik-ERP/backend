import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomersController } from './customer.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoriesController } from '../categories/categories.controller';
import { CategoriesService } from '../categories/categories.service';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomerService, Reflector],
  exports: [CustomerService],
})
export class CustomerModule {}
