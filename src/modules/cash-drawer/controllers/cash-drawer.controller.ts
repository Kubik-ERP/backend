import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Headers,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AddTransactionBody,
  AddTransactionParams,
  CashDrawerListQueryDto,
  CashDrawerQueryDto,
  CashFlowParamsDto,
  CloseCashDrawerDto,
  OpenCashDrawerDto,
} from '../dtos/cash-drawer.dto';
import { CashDrawerService } from '../services/cash-drawer.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { UsersService } from 'src/modules/users/services/users.service';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  convertFromUnixTimestamp,
  formatDate,
} from 'src/common/helpers/common.helpers';
import { formatPaginatedResult } from 'src/common/helpers/pagination.helpers';

@Controller('cash-drawer')
@UseGuards(AuthPermissionGuard)
@ApiBearerAuth()
export class CashDrawerController {
  // Controller methods will be defined here in the future
  // For example, you might have methods for opening, closing, and checking the status of the cash drawer

  constructor(
    private readonly service: CashDrawerService,
    private readonly userService: UsersService,
  ) {}

  @HttpCode(200)
  @ApiOperation({ summary: 'Get Cash Drawer List' })
  @RequirePermissions('set_up_cash_drawer', 'close_cash_register')
  @Get('list/:storeId')
  @ApiParam({
    name: 'storeId',
  })
  async getList(
    @Param('storeId') storeId: string,
    @Query() query: CashDrawerListQueryDto,
  ) {
    // Logic to get the status of the cash drawer
    const [result, count] = await this.service.getCashDrawerLists(
      storeId,
      query,
    );
    if (!result || result == null) {
      return {
        message: 'No cash drawer records found',
        result: [],
      };
    }

    const data = formatPaginatedResult(
      result,
      parseInt(count.toString()),
      query.page,
      query.limit,
    );

    return {
      message: 'Cash drawer status retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @HttpCode(200)
  @ApiOperation({ summary: 'Get Today Status' })
  @RequirePermissions('set_up_cash_drawer', 'close_cash_register')
  @Get('status/:storeId')
  @ApiParam({
    name: 'storeId',
  })
  async getCashDrawerStatus(@Param('storeId') storeId: string) {
    // Logic to get the status of the cash drawer
    const result = await this.service.getCashDrawerStatus(storeId);
    let data = {};
    if (result) {
      data = {
        id: result.id,
        status: result.status,
        expectedBalance: result.expected_balance,
        actualBalance: result.actual_balance,
        notes: result.notes,
        createdAt: result.created_at
          ? convertFromUnixTimestamp(result.created_at)
          : null,
        createdBy: result.created_by,
      };
    }
    return {
      message: 'Cash drawer status retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @HttpCode(200)
  @ApiOperation({
    summary: 'Create store',
    description:
      'Owner user id dari payload, cashier: user id dari login information',
  })
  @RequirePermissions('set_up_cash_drawer')
  @ApiParam({
    name: 'storeId',
    description: 'ID of the store where the cash drawer is opened',
  })
  @Post('open/:storeId')
  async openCashDrawer(
    @Body() openCashDrawerDto: OpenCashDrawerDto,
    @Req() req: ICustomRequestHeaders,
    @Param('storeId') storeId: string,
  ) {
    let staffId = '';
    const role = await this.userService.getUserRole(req.user.id);
    console.log('role', role);
    if (role == 'Owner') {
      staffId = openCashDrawerDto.userId || '';
    }

    //TODO: get staff id if role is not owner

    const data = await this.service.openCashDrawer(
      req.user.id,
      staffId,
      openCashDrawerDto.balance,
      storeId,
      openCashDrawerDto.notes,
    );

    return {
      message: 'Cash drawer opened successfully',
      result: toCamelCase(data),
    };
  }

  @Put('edit/:cashDrawerId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Edit cash drawer details' })
  @RequirePermissions('set_up_cash_drawer')
  @ApiParam({
    name: 'cashDrawerId',
    description: 'ID of the cash drawer to edit',
  })
  async editCashDrawer(
    @Req() req: ICustomRequestHeaders,
    @Param('cashDrawerId') cashDrawerId: string,
    @Body() body: Partial<OpenCashDrawerDto>,
  ) {
    const role = await this.userService.getUserRole(req.user.id);
    if (role !== 'Owner') {
      throw new Error('Only owner can edit cash drawer details');
    }

    const updatedCashDrawer = await this.service.editCashDrawer(
      cashDrawerId,
      req.user.id,
      body.balance ?? 0,
    );

    return {
      message: 'Cash drawer details updated successfully',
      result: updatedCashDrawer,
    };
  }

  //Implement the addTransaction method to handle adding transactions to the cash drawer
  @HttpCode(200)
  @RequirePermissions('cash_in_out')
  @ApiParam({
    name: 'type',
    enum: ['in', 'out'],
  })
  @ApiParam({
    name: 'cashDrawerId',
  })
  @Post('transaction/add/:type/:cashDrawerId')
  async addTransaction(
    @Param() params: AddTransactionParams,
    @Body() body: AddTransactionBody,
    @Req() req: ICustomRequestHeaders,
  ) {
    let type = 0;
    let amountIn = 0;
    let amountOut = 0;

    if (params.type === 'in') {
      type = 1; // Assuming type 1 for cash in
      amountIn = body.amount; // Example amount for cash in
    } else if (params.type === 'out') {
      type = 3; // Assuming type 3 for cash out
      amountOut = body.amount; // Example amount for cash out
    } else {
      throw new Error('Invalid transaction type');
    }

    await this.service.addCashDrawerTransaction(
      params.cashDrawerId,
      amountIn,
      amountOut,
      type, // Assuming type 1 for cash in/out transactions
      body.notes,
      req.user.id,
    );

    // Logic to add a transaction to the cash drawer
    return { message: 'Transaction added successfully' };
  }

  @HttpCode(200)
  @ApiOperation({
    summary: 'Close cash drawer',
    description: 'Close Case Drawer',
  })
  @RequirePermissions('close_cash_register')
  @Post('close/:cashDrawerId')
  @ApiParam({
    name: 'cashDrawerId',
  })
  async closeCashDrawer(
    @Body() body: CloseCashDrawerDto,
    @Req() req: ICustomRequestHeaders,
    @Param('cashDrawerId') cashDrawerId: string,
  ) {
    await this.service.closeCashDrawer(cashDrawerId, req.user.id, body.balance);
    return { message: 'Cash drawer closed successfully' };
  }

  @ApiParam({
    name: 'cashDrawerId',
    description:
      'type: 0=> opening, 1 => cash in, 2 => sale, 3 => cash out, 4 => refund, 5 =>closing',
  })
  @RequirePermissions('cash_in_out')
  @Get('transactions/:cashDrawerId')
  async getCashDrawerTransactions(
    @Param('cashDrawerId') cashDrawerId: string,
    @Query() query: CashDrawerQueryDto,
  ) {
    // Logic to get transactions related to the cash drawer
    const [data, total] = await this.service.getCashDrawerTransactions(
      cashDrawerId,
      query,
    );

    let results = toCamelCase(data);
    let res = formatPaginatedResult(
      results,
      parseInt(total.toString()) ?? 0,
      query.page,
      query.limit,
    );

    return {
      message: 'Cash drawer transactions retrieved successfully',
      result: res,
    };
  }

  @Get('details/:cashDrawerId')
  @RequirePermissions('set_up_cash_drawer', 'close_cash_register')
  @ApiParam({
    name: 'cashDrawerId',
    description: 'ID of the cash drawer to retrieve details for',
  })
  async getDetailsCashDrawer(@Param('cashDrawerId') cashDrawerId: string) {
    // Logic to get the details of a specific cash drawer
    const result = await this.service.getDetailsCashDrawer(cashDrawerId);
    if (!result) {
      return {
        message: 'Cash drawer not found',
        result: null,
      };
    }

    return {
      message: 'Cash drawer details retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('transaction/summary/:cashDrawerId')
  @RequirePermissions('cash_in_out')
  @ApiParam({
    name: 'cashDrawerId',
    description: 'ID of the cash drawer',
  })
  async getCashdrawerTransSummary(@Param('cashDrawerId') cashDrawerId: string) {
    const res =
      await this.service.getCashDrawerTransactionsSummary(cashDrawerId);
    if (!res) {
      return {
        message: 'No transactions found for this cash drawer',
        result: null,
      };
    }

    const result = {
      points: res.points || 0,
      debits: res.debit || 0,
      wallet: res.qris || 0,
      sales: res.sales || 0,
      cashIn: res.cashIn || 0,
      cashOut: res.cashOut || 0,
    };

    return {
      message: 'Cash drawer summary data retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('transaction/cashflow')
  @RequirePermissions('cash_in_out')
  async getCashFlow(
    @Req() req: ICustomRequestHeaders,
    @Query() params: CashFlowParamsDto,
    @Headers('x-store-id') storeId: string,
  ) {
    const [data, count] = await this.service.getCashFlow(params, storeId);
    const results = toCamelCase(data);
    const res = formatPaginatedResult(
      results,
      parseInt(count.toString()) ?? 0,
      params.page,
      params.limit,
    );

    return {
      message: 'Cash drawer transactions retrieved successfully',
      result: res,
    };
  }
}
