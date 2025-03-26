import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { InvoiceService } from '../services/invoices.service';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';
import { PaymentCallbackDto } from '../dtos/callback-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: InvoiceService) {}

  @Post('process')
  public async processPayment(@Body() body: ProcessPaymentDto) {
    const result = await this.paymentService.processPayment(body);
    return {
      result,
    };
  }

  @Post('verify')
  public async verifyPayment(
    @Query('provider') provider: string,
    @Query('paymentId') paymentId: string,
  ) {
    const result = await this.paymentService.verifyPayment(provider, paymentId);

    return {
      result,
    };
  }

  @Get('callback')
  public async handlePaymentCallback(
    @Query() callbackData: PaymentCallbackDto,
  ) {
    const { order_id, status_code, transaction_status } = callbackData;

    return await this.paymentService.handlePaymentCallback(
      order_id,
      status_code,
      transaction_status,
    );
  }

  @Get('method')
  public async paymentMethodList() {
    const result = await this.paymentService.findAllPaymentMethod();

    return {
      result,
    };
  }
}
