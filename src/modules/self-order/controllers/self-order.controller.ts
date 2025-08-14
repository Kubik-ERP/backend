import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { SelfOrderService } from '../services/self-order.service';
import { CreateCustomerDto } from '../../customer/dto/create-customer.dto';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';
import { ApiTags } from '@nestjs/swagger';
import { CustomerService } from '../../customer/customer.service';
import { SelfOrderSignUpDto } from '../dtos/self-order-signup.dto';

@ApiTags('Self Order')
@Controller('self-order/customers')
export class SelfOrderController {
  constructor(
    private readonly selfOrderService: SelfOrderService,
    private readonly customersService: CustomerService,
  ) {}

  // 1) Sign in: verify by code and number
  @Get('signin')
  async signIn(@Query('code') code: string, @Query('number') number: string) {
    const result = await this.selfOrderService.signIn({ code, number });
    return {
      statusCode: 200,
      message: 'Success',
      result: toCamelCase(result),
    };
  }

  // 2) Sign up: reuse customers module create flow; name is required
  @Post('signup')
  async signUp(
    @Body() dto: SelfOrderSignUpDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      // Map storeId from body to request header expected by customersService
      req.store_id = dto.storeId;

      const newCustomer = await this.customersService.create(
        {
          name: dto.name,
          code: dto.code,
          number: dto.number,
        } as CreateCustomerDto,
        req,
      );
      return {
        statusCode: 201,
        message: 'Customer created successfully',
        result: toCamelCase(newCustomer),
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }
}
