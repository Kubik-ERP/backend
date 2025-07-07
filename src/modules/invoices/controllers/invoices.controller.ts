import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  Req,
  UseGuards,
  Put,
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
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import {
  GetListInvoiceDto,
  UpdateInvoiceOrderStatusDto,
} from '../dtos/invoice.dto';
import { SentEmailInvoiceByIdDto } from '../dtos/sent-email.dto';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { GenerateInvoiceNumberResponseDto } from '../dtos/GenerateInvoiceNumberResponseDto.dto';
import { TemplatesEmailService } from '../../templates-email/services/templates-email.service';
// Enum
import { EmailTemplateType } from '../../../enum/EmailTemplateType-enum';

@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly templatesEmailService: TemplatesEmailService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get List of invoices',
  })
  public async invoiceList(@Query() query: GetListInvoiceDto) {
    const response = await this.invoiceService.getInvoices(query);
    return {
      result: toCamelCase(response),
    };
  }

  @Get(':invoiceId')
  @ApiOperation({
    summary: 'Get invoice by invoice ID',
  })
  public async invoiceByKey(@Param('invoiceId') invoiceId: string) {
    const response = await this.invoiceService.getInvoicePreview({
      invoiceId: invoiceId,
    });

    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Put('order/status/:invoiceId')
  @ApiOperation({
    summary: 'Update order status of the invoice',
  })
  public async UpdateInvoiceOrderStatus(
    @Param('invoiceId') invoiceId: string,
    @Body() body: UpdateInvoiceOrderStatusDto,
  ) {
    const response = await this.invoiceService.UpdateInvoiceOrderStatus(
      invoiceId,
      body,
    );

    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post('sent-email/:invoiceId')
  @ApiOperation({
    summary: 'Sent email invoice to customer by invoice ID',
  })
  public async sentEmailInvoiceById(@Param() param: SentEmailInvoiceByIdDto) {
    const { invoiceId } = param;
    const response = await this.templatesEmailService.sendEmailInvoice(
      EmailTemplateType.RECEIPT,
      invoiceId,
    );

    return {
      result: toCamelCase(response),
    };
  }

  @Post('generate-invoice-number')
  @ApiOperation({
    summary: 'Generate a new invoice number',
  })
  public async generateInvoiceNumber(
    @Body() body: GenerateInvoiceNumberResponseDto,
  ) {
    const storeId = body.storeId;
    const invoiceNumber =
      await this.invoiceService.generateInvoiceNumber(storeId);
    return {
      result: {
        invoiceNumber,
      },
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post('process/instant')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Create invoice and pay it instantly',
  })
  public async processInstantPayment(
    @Req() req: ICustomRequestHeaders,
    @Body() body: ProceedInstantPaymentDto,
  ) {
    const response = await this.invoiceService.proceedInstantPayment(req, body);
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post('process/checkout')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Create invoice with unpaid status',
  })
  public async processCheckout(
    @Req() req: ICustomRequestHeaders,
    @Body() body: ProceedCheckoutInvoiceDto,
  ) {
    const response = await this.invoiceService.proceedCheckout(req, body);
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
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

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
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
