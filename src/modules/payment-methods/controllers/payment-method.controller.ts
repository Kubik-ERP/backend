import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentMethodService } from '../services/payment-method.service';
import { CreatePaymentMethodDto } from '../dtos/payment-method.dto';
import { payment_methods } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('payment/method')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post('')
  @ApiOperation({
    summary: 'Create a new payment method',
  })
  public async paymentMethodAdd(@Body() requestBody: CreatePaymentMethodDto) {
    const paymentMethod: payment_methods = {
      id: uuidv4(),
      name: requestBody.name,
      icon_name: requestBody.iconName,
      sort_no: requestBody.sortNo,
      is_available: true,
    };
    await this.paymentMethodService.createPaymentMethod(paymentMethod);
    return {
      message: 'Payment Method successfully created',
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Put('')
  @ApiOperation({
    summary: 'Update the current payment method by ID',
  })
  public async paymentMethodUpdate(
    @Query('id') id: string,
    @Body() requestBody: CreatePaymentMethodDto,
  ) {
    const paymentMethod: payment_methods = {
      id: id,
      name: requestBody.name,
      icon_name: requestBody.iconName,
      sort_no: requestBody.sortNo,
      is_available: requestBody.isAvailable,
    };
    await this.paymentMethodService.updatePaymentMethodById(paymentMethod);
    return {
      message: 'Payment Method successfully updated',
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get list of the payment methods',
  })
  public async paymentMethodList() {
    const response = await this.paymentMethodService.findAllPaymentMethod();

    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Delete('')
  @ApiOperation({
    summary: 'Delete a payment method by ID',
  })
  public async paymentMethodRemove(@Query('id') id: string) {
    await this.paymentMethodService.deletePaymentMethodById(id);

    return {
      message: 'Payment Method successfully deleted',
    };
  }
}
