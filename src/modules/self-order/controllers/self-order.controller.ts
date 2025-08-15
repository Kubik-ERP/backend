import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { SelfOrderService } from '../services/self-order.service';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';
import { ApiTags } from '@nestjs/swagger';
import { SelfOrderSignUpDto } from '../dtos/self-order-signup.dto';

@ApiTags('Self Order')
@Controller('self-order/customers')
export class SelfOrderController {
  constructor(private readonly selfOrderService: SelfOrderService) {}

  // Sign up: if exists (by code+number+store) return existing, else create via customersService.create
  @Post('signup')
  async signUp(
    @Body() dto: SelfOrderSignUpDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const { customer, created } = await this.selfOrderService.signUp(dto, req);
    return {
      statusCode: created ? 201 : 200,
      message: created ? 'Customer created successfully' : 'Customer found',
      result: toCamelCase(customer),
    };
  }
}
