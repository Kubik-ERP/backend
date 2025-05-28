import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '../../prisma/prisma.service';

import { validate as isUUID } from 'uuid';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';
import { customer as CustomerModel } from '@prisma/client';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { name: createCustomerDto.name },
      });

      if (existingCustomer) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Customer name already exist',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const customerData: any = {
        name: createCustomerDto.name,
        code: createCustomerDto.code,
        number: createCustomerDto.number,
        email: createCustomerDto.email,
        dob: createCustomerDto.dob,
        address: createCustomerDto.address,
      };

      if (
        createCustomerDto.customers_has_tag &&
        createCustomerDto.customers_has_tag.length > 0
      ) {
        customerData.customers_has_tag = {
          create: createCustomerDto.customers_has_tag.map((tag) => ({
            tag_id: tag.id,
          })),
        };
      }

      const newCustomer = await this.prisma.customer.create({
        data: customerData,
        include: {
          customers_has_tag: true,
        },
      });

      return newCustomer;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async findAll(): Promise<CustomerModel[]> {
    const customer = await this.prisma.customer.findMany();
    return customer;
  }

  public async findOne(idOrName: string): Promise<CustomerModel | null> {
    if (isUUID(idOrName)) {
      return await this.prisma.customer.findUnique({
        where: { id: idOrName },
      });
    } else {
      return await this.prisma.customer.findFirst({
        where: {
          name: { contains: idOrName, mode: 'insensitive' },
        },
      });
    }
  }

  public async findMany(
    idOrName: string,
  ): Promise<CustomerModel | CustomerModel[] | null> {
    if (isUUID(idOrName)) {
      return await this.prisma.customer.findUnique({
        where: { id: idOrName },
      });
    } else {
      return await this.prisma.customer.findMany({
        where: {
          name: { contains: idOrName, mode: 'insensitive' },
        },
      });
    }
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      if (updateCustomerDto.name) {
        const duplicateCustomer = await this.prisma.customer.findFirst({
          where: { name: updateCustomerDto.name, NOT: { id } },
        });

        if (duplicateCustomer) {
          throw new BadRequestException('Customer name must be unique');
        }
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: {
          name: updateCustomerDto.name || updateCustomerDto.name,
          code: updateCustomerDto.code,
          number: updateCustomerDto.number,
          email: updateCustomerDto.email,
          dob: updateCustomerDto.dob,
          address: updateCustomerDto.address,
        },
      });

      return updatedCustomer;
    } catch (error) {
      console.error('Error updating Customer:', error);
      throw new Error(error.message || 'Failed to update Customer');
    }
  }

  async remove(id: string) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      await this.prisma.customer.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw new Error('Failed to delete customer');
    }
  }
}
