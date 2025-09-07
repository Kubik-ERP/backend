import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { point_type } from '@prisma/client';
import { AuthPermissionGuard } from '../../common/guards/auth-permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { CustomerService } from './customer.service';
import { CreateCustomerPointDto } from './dto/create-customer-point.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { QueryLoyaltyPointsDto } from './dto/query-loyalty-points.dto';
import { UpdateCustomerPointsDto } from './dto/update-customer-points.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomerService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('customer_management')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post()
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const newCustomer = await this.customersService.create(
        createCustomerDto,
        req,
      );
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions(
    'process_unpaid_invoice',
    'check_out_sales',
    'customer_management',
  )
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Req() req: ICustomRequestHeaders,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      const customers = await this.customersService.findAll(
        {
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 10,
          search,
        },
        req,
      );

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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('customer_management', 'view_customer_profile')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('management_customer_loyalty_point')
  @ApiBearerAuth()
  @Get('/loyalty-points/:id')
  async loyaltyPoints(
    @Param('id') id: string,
    @Query() query: QueryLoyaltyPointsDto,
  ) {
    const customer = await this.customersService.loyaltyPoints(id, query);
    return {
      message: 'Success',
      result: toCamelCase(customer),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('management_customer_loyalty_point')
  @ApiBearerAuth()
  @Post('/loyalty-points/:type')
  async createLoyaltyPoint(
    @Param('type') type: point_type,
    @Body() dto: CreateCustomerPointDto,
  ) {
    const result = await this.customersService.createLoyaltyPoint(type, dto);
    return {
      message: 'Point added successfully',
      result,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('management_customer_loyalty_point')
  @ApiBearerAuth()
  @Patch('/loyalty-points/:id')
  async updateLoyaltyPoints(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerPointsDto,
  ) {
    const result = await this.customersService.updateLoyaltyPoint(id, dto);
    return {
      message: 'Point updated successfully',
      result,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('customer_management', 'view_customer_profile')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('customer_management')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('customer_management')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
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
