import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OpenCashDrawerDto } from '../dtos/cash-drawer.dto';
import { CashDrawerService } from '../services/cash-drawer.service';
import { ApiParam } from '@nestjs/swagger';

@Controller('cash-drawer')
export class CashDrawerController {
  // Controller methods will be defined here in the future
  // For example, you might have methods for opening, closing, and checking the status of the cash drawer

  constructor(private readonly service: CashDrawerService) { }

  @Get('status')
  @ApiParam({
    name: 'storeId'
  })
  async getCashDrawerStatus(@Param('storeId') storeId: string) {
    // Logic to get the status of the cash drawer
    const status = await this.service.getCashDrawerStatus(storeId);
    return {
      message: 'Cash drawer status retrieved successfully',
      result: {
        open: status,
      },
    };
  }

  @Post('open')
  async openCashDrawer(@Body() openCashDrawerDto: OpenCashDrawerDto) {
    // Logic to open the cash drawer
    await this.service.openCashDrawer(
      openCashDrawerDto.userId,
      openCashDrawerDto.balance,
      openCashDrawerDto.notes,
      openCashDrawerDto.storeId,
    );

    return { message: 'Cash drawer opened successfully' };
  }

  @Post('transaction/add')
  async addTransaction() {
    // Logic to add a transaction to the cash drawer
    return { message: 'Transaction added successfully' };
  }

  @Get('close')
  async closeCashDrawer() {
    // Logic to close the cash drawer
    return { message: 'Cash drawer closed successfully' };
  }

  @Get('transactions')
  async getCashDrawerTransactions() {
    // Logic to get transactions related to the cash drawer
    return [
      { id: 1, amount: 100, type: 'deposit', date: '2023-10-01' },
      { id: 2, amount: 50, type: 'withdrawal', date: '2023-10-02' },
    ]; // Example response
  }
}
