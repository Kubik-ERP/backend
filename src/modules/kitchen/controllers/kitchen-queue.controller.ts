import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { KitchenService } from '../services/kitchen.service';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  // @UseGuards(AuthenticationJWTGuard)
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
}
