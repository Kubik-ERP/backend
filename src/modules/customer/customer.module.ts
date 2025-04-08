import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomersController } from './customer.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoriesController } from '../categories/categories.controller';
import { CategoriesService } from '../categories/categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
