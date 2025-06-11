import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CloseCashDrawerDto, OpenCashDrawerDto } from '../dtos/cash-drawer.dto';
import { CashDrawerService } from '../services/cash-drawer.service';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { UsersService } from 'src/modules/users/services/users.service';

@Controller('cash-drawer')
export class CashDrawerController {
  // Controller methods will be defined here in the future
  // For example, you might have methods for opening, closing, and checking the status of the cash drawer

  constructor(
    private readonly service: CashDrawerService,
    private readonly userService: UsersService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store' })
  @Get('status')
  @ApiParam({
    name: 'storeId',
  })
  async getCashDrawerStatus(@Param('storeId') storeId: string) {
    // Logic to get the status of the cash drawer
    const result = await this.service.getCashDrawerStatus(storeId);
    return {
      message: 'Cash drawer status retrieved successfully',
      result: result,
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create store',
    description:
      'Owner user id dari login information, cashier: user id kirim lewat payload',
  })
  @Post('open')
  async openCashDrawer(
    @Body() openCashDrawerDto: OpenCashDrawerDto,
    @Req() req: IRequestUser,
  ) {
    let userId = openCashDrawerDto.userId;
    const role = await this.userService.getUserRole(openCashDrawerDto.userId);
    if (role === 'Owner') {
      userId = req.id;
    }

    await this.service.openCashDrawer(
      userId,
      openCashDrawerDto.balance,
      openCashDrawerDto.storeId,
      openCashDrawerDto.notes,
    );

    return { message: 'Cash drawer opened successfully' };
  }

  //TODO: Implement the addTransaction method to handle adding transactions to the cash drawer
  @Post('transaction/add')
  async addTransaction() {
    // Logic to add a transaction to the cash drawer
    return { message: 'Transaction added successfully' };
  }

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store' })
  @Post('close')
  async closeCashDrawer(
    @Body() body: CloseCashDrawerDto,
    @Req() req: IRequestUser,
  ) {
    await this.service.closeCashDrawer(body.cashDrawerId, req.id, body.balance);
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
