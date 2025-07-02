import { Body, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { KitchenService } from '../services/kitchen.service';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @UseGuards(AuthenticationJWTGuard)
  @Get('ticket/:invoiceId')
  @ApiOperation({
    summary: 'Get Kitchen Ticket in Invoice Detail',
  })
  public async getTicketByInvoiceId(@Param('invoiceId') invoiceId: string) {
    const response = await this.kitchenService.ticketByInvoiceId({
      invoiceId,
    });
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get('queue')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Fetch kitchen queue list',
  })
  public async processInstantPayment(@Req() req: ICustomRequestHeaders) {
    const response = await this.kitchenService.queueList(req);
    return {
      result: toCamelCase(response),
    };
  }
}
