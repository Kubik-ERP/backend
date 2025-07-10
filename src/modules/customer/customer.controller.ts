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
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerService } from './customer.service';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { AuthenticationJWTGuard } from '../../common/guards/authentication-jwt.guard';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { CreateCustomerPointDto } from './dto/create-customer-point.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

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
        result: toCamelCase(newCustomer),
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
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      const customers = await this.customersService.findAll({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        search,
      });

      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(customers),
      };
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

  @Get('details/:id')
  async getCustomerDetails(
    @Param('id') id: string,
    @Query() query: QueryInvoiceDto,
  ) {
    try {
      const result = await this.customersService.details(id, query);
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch detail Customers',
          result: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/loyalty-points/:id')
  async loyaltyPoints(@Param('id') id: string) {
    try {
      const customer = await this.customersService.loyaltyPoints(id);
      if (!customer) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Customer not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(customer),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch detail Customers',
          result: error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/loyalty-points')
  async createLoyaltyPoint(@Body() dto: CreateCustomerPointDto) {
    try {
      const result = await this.customersService.createLoyaltyPoint(dto);
      return {
        statusCode: 201,
        message: 'Point added successfully',
        result,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to create customer point',
          result: error,
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
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(customer),
      };
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
        result: toCamelCase(updatedCustomer),
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

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Customer Waiting List Orders (Only for today and dine-in)',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get('/waiting/list')
  async waitingListOrders(@Req() req: ICustomRequestHeaders) {
    const responses = await this.customersService.queueWaitingListOrder(req);
    return {
      result: toCamelCase(responses),
    };
  }
}
