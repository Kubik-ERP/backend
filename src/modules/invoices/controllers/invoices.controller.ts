import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoices.service';
import {
  CalculationEstimationDto,
  ProceedCheckoutInvoiceDto,
  ProceedInstantPaymentDto,
  ProceedPaymentDto,
} from '../dtos/process-payment.dto';
import {
  PaymentCallbackCoreDto,
  PaymentCallbackDto,
} from '../dtos/callback-payment.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetInvoiceDto, GetListInvoiceDto } from '../dtos/invoice.dto';
import { SentEmailInvoiceByIdDto } from '../dtos/sent-email.dto';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get List of invoices',
  })
  public async invoiceList(
    @Req() req: ICustomRequestHeaders,
    @Query() query: GetListInvoiceDto,
  ) {
    const response = await this.invoiceService.getInvoices(query);
    return {
      result: toCamelCase(response),
    };
  }

  @Get(':invoiceId')
  @ApiOperation({
    summary: 'Get invoice by invoice ID',
  })
  public async invoiceById(@Param() param: GetInvoiceDto) {
    const response = await this.invoiceService.getInvoicePreview(param);

    return {
      result: toCamelCase(response),
    };
  }

  @Post('sent-email/:invoiceId')
  @ApiOperation({
    summary: 'Sent email invoice to customer by invoice ID',
  })
  public async sentEmailInvoiceById(@Param() param: SentEmailInvoiceByIdDto) {
    const { invoiceId } = param; // Mengambil invoiceId dari param
    const response = await this.invoiceService.sentEmailInvoiceById(invoiceId);

    return {
      result: toCamelCase(response),
    };
  }

  @Post('process/instant')
  @ApiOperation({
    summary: 'Create invoice and pay it instantly',
  })
  public async processInstantPayment(@Body() body: ProceedInstantPaymentDto) {
    const response = await this.invoiceService.proceedInstantPayment(body);
    return {
      result: toCamelCase(response),
    };
  }

  @Post('process/checkout')
  @ApiOperation({
    summary: 'Create invoice with unpaid status',
  })
  public async processCheckout(@Body() body: ProceedCheckoutInvoiceDto) {
    const response = await this.invoiceService.proceedCheckout(body);
    return {
      result: toCamelCase(response),
    };
  }

  @Post('process/payment')
  @ApiOperation({
    summary: 'Pay the unpaid invoice',
  })
  public async processPayment(@Body() body: ProceedPaymentDto) {
    const response = await this.invoiceService.proceedPayment(body);
    return {
      result: toCamelCase(response),
    };
  }

  @Get('webhook/snap')
  @ApiOperation({
    summary: 'Listening the callback response from SNAP',
  })
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

  @Post('webhook/core/qris')
  @ApiOperation({
    summary: 'Listening the callback response from API Core QRIS',
  })
  public async handlePaymentCallbackCore(
    @Body() callbackData: PaymentCallbackCoreDto,
  ) {
    return await this.invoiceService.handlePaymentCoreCallback(callbackData);
  }

  @Post('calculate/estimation')
  @ApiOperation({
    summary: 'Simulate the total estimation',
  })
  public async calculateEstimation(
    @Body() requestData: CalculationEstimationDto,
  ) {
    const result = await this.invoiceService.calculateTotal(requestData);

    return {
      result,
    };
  }
}
