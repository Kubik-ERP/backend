import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CashDrawerQueryDto,
  CloseCashDrawerDto,
  OpenCashDrawerDto,
} from '../dtos/cash-drawer.dto';
import { CashDrawerService } from '../services/cash-drawer.service';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { UsersService } from 'src/modules/users/services/users.service';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  convertFromUnixTimestamp,
  formatDate,
} from 'src/common/helpers/common.helpers';
import { formatPaginatedResult } from 'src/common/helpers/pagination.helpers';

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
  @Get('list/:storeId')
  @ApiParam({
    name: 'storeId',
  })
  async getList(
    @Param('storeId') storeId: string,
    @Query() query: CashDrawerQueryDto,
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

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store' })
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

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create store',
    description:
      'Owner user id dari payload, cashier: user id dari login information',
  })
  @Post('open')
  async openCashDrawer(
    @Body() openCashDrawerDto: OpenCashDrawerDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    let userId = openCashDrawerDto.userId;

    const role = await this.userService.getUserRole(req.user.id);
    if (role !== 'Owner') {
      userId = req.user.id;
    }

    await this.service.openCashDrawer(
      userId,
      openCashDrawerDto.balance,
      openCashDrawerDto.storeId,
      openCashDrawerDto.notes,
    );

    return { message: 'Cash drawer opened successfully' };
  }

  @Put('edit/:cashDrawerId')
  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit cash drawer details' })
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

  //TODO: Implement the addTransaction method to handle adding transactions to the cash drawer
  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiParam({
    name: 'type',
    enum: ['in', 'out'],
  })
  @Post('transaction/add/:type')
  async addTransaction(@Req() req: ICustomRequestHeaders) {
    // Logic to add a transaction to the cash drawer
    return { message: 'Transaction added successfully' };
  }

  @UseGuards(AuthenticationJWTGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create store',
    description:
      'type: 0=> opening, 1 => cash in, 2 => sale, 3 => cash out, 4 => refund, 5 =>closing',
  })
  @Post('close')
  async closeCashDrawer(
    @Body() body: CloseCashDrawerDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    await this.service.closeCashDrawer(
      body.cashDrawerId,
      req.user.id,
      body.balance,
    );
    return { message: 'Cash drawer closed successfully' };
  }

  @Get('transactions')
  async getCashDrawerTransactions() {
    // Logic to get transactions related to the cash drawer
    const data = [
      {
        id: 4,
        amount: 100,
        type: 5,
        date: '2023-10-01 12:59',
        finalAmount: 5000,
      }, //closing register
      {
        id: 4,
        amount: 100,
        type: 4,
        date: '2023-10-01 12:59',
        finalAmount: 5000,
      }, //cash refund
      {
        id: 4,
        amount: 100,
        type: 3,
        date: '2023-10-01 12:59',
        finalAmount: 5000,
      }, //cash out
      {
        id: 3,
        amount: 50,
        type: 2,
        date: '2023-10-02 12:59',
        finalAmount: 5000,
      }, //sale
      {
        id: 2,
        amount: 100,
        type: 1,
        date: '2023-10-01 12:59',
        finalAmount: 5000,
      }, //cash in
      {
        id: 1,
        amount: 50,
        type: 0,
        date: '2023-10-02 12:59',
        finalAmount: 5000,
      }, //opening
    ];

    let res = formatPaginatedResult(data, 6)

    return {
      message: 'Cash drawer transactions retrieved successfully',
      result: res
    }
  }
}
