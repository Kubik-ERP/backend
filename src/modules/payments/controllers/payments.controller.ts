import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { PaymentService } from '../services/payments.service';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';
import { PaymentCallbackDto } from '../dtos/callback-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('process')
  async processPayment(@Body() body: ProcessPaymentDto) {
    const { provider, orderId, amount } = body;

    const result = await this.paymentService.processPayment(
      provider,
      orderId,
      amount,
    );

    return {
      result,
    };
  }

  @Post('verify')
  async verifyPayment(
    @Query('provider') provider: string,
    @Query('paymentId') paymentId: string,
  ) {
    const result = await this.paymentService.verifyPayment(provider, paymentId);

    return {
      result,
    };
  }

  @Get('callback')
  async handlePaymentCallback(@Query() callbackData: PaymentCallbackDto) {
    return await this.paymentService.handlePaymentCallback(callbackData);
  }
}
