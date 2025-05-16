import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoices.service';
import {
  CalculationEstimationDto,
  ProcessPaymentDto,
} from '../dtos/process-payment.dto';
import {
  PaymentCallbackCoreDto,
  PaymentCallbackDto,
} from '../dtos/callback-payment.dto';
import { CreatePaymentMethodDto } from '../dtos/payment-method.dto';
import { payment_methods } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Controller('payment')
export class PaymentController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('process')
  public async processPayment(@Body() body: ProcessPaymentDto) {
    const result = await this.invoiceService.processPayment(body);
    return {
      result,
    };
  }

  @Get('callback/snap')
  public async handlePaymentCallback(
    @Query() callbackData: PaymentCallbackDto,
  ) {
    const { order_id, status_code, transaction_status } = callbackData;

    return await this.invoiceService.handlePaymentCallback(
      order_id,
      status_code,
      transaction_status,
    );
  }

  @Post('callback/core/qris')
  public async handlePaymentCallbackCore(
    @Body() callbackData: PaymentCallbackCoreDto,
  ) {
    return await this.invoiceService.handlePaymentCoreCallback(callbackData);
  }

  @Post('calculate/estimation')
  public async calculateEstimation(
    @Body() requestData: CalculationEstimationDto,
  ) {
    const result = await this.invoiceService.calculateTotal(requestData);

    return {
      result,
    };
  }

  @Post('method')
  public async paymentMethodAdd(@Body() requestBody: CreatePaymentMethodDto) {
    const paymentMethod: payment_methods = {
      id: uuidv4(),
      name: requestBody.name,
      icon_name: requestBody.icon_name,
      sort_no: requestBody.sort_no,
    };
    await this.invoiceService.createPaymentMethod(paymentMethod);
    return {
      message: 'Payment Method successfully created',
    };
  }

  @Put('method')
  public async paymentMethodUpdate(
    @Query('id') id: string,
    @Body() requestBody: CreatePaymentMethodDto,
  ) {
    const paymentMethod: payment_methods = {
      id: id,
      name: requestBody.name,
      icon_name: requestBody.icon_name,
      sort_no: requestBody.sort_no,
    };
    await this.invoiceService.updatePaymentMethodById(paymentMethod);
    return {
      message: 'Payment Method successfully updated',
    };
  }

  @Get('method')
  public async paymentMethodList() {
    const result = await this.invoiceService.findAllPaymentMethod();

    return {
      result,
    };
  }

  @Delete('method')
  public async paymentMethodRemove(@Query('id') id: string) {
    await this.invoiceService.deletePaymentMethodById(id);

    return {
      message: 'Payment Method successfully deleted',
    };
  }
}
