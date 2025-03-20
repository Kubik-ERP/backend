import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomerService) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      const newCustomer = await this.customersService.create(createCustomerDto);
      return {
        statusCode: 201,
        message: 'Customer created successfully',
        result: newCustomer,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const customers = await this.customersService.findAll();
      return { statusCode: 200, message: 'Success', result: customers };
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch customers',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':idOrName')
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const customer = await this.customersService.findOne(idOrName);
      if (!customer) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Customer not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { statusCode: 200, message: 'Success', result: customer };
    } catch (error) {
      console.error('Error finding customer:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch customer',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    try {
      const updatedCustomer = await this.customersService.update(
        id,
        updateCustomerDto,
      );
      if (!updatedCustomer) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Customer not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        statusCode: 200,
        message: 'Customer updated successfully',
        result: updatedCustomer,
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update customer',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deletedCustomer = await this.customersService.remove(id);
      if (!deletedCustomer) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Customer not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { statusCode: 200, message: 'Customer deleted successfully' };
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete customer',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
