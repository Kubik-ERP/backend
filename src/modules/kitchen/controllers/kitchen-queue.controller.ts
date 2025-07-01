import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('kitchen')
export class KitchenController {
  constructor() {
    //
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('ticket/:invoiceId')
  @ApiOperation({
    summary: 'Get Kitchen Ticket in Invoice Detail',
  })
  public async getTicketByInvoiceId(@Param('invoiceId') invoiceId: string) {
    // Implement your logic here
  }
}
