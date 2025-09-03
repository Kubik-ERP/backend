import {
  Controller,
  Get,
  ParseDatePipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { DashboardService } from './dashboard.service';

export type FinancialReportType =
  | 'profit-loss'
  | 'cashin-out'
  | 'payment-method'
  | 'tax-service';

export type SummaryType = 'time' | 'days' | 'month';

export type SalesReportType = 'item' | 'order';

export type StockReportType = 'stock' | 'movement';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('summary')
  @ApiOperation({
    summary: 'Get summary data for the main dashboard within a date range.',
  })
  async getDashboardSummary(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Query('type') type: SummaryType,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getDashboardSummary(
      startDate,
      endDate,
      type,
      req,
    );
    return {
      message: 'Dashboard summary retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('financial-report')
  @ApiOperation({
    summary:
      'Get financial report data for the main dashboard within a date range.',
  })
  async getFinancialReport(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Query('type') type: FinancialReportType,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getFinancialReport(
      startDate,
      endDate,
      type,
      req,
    );
    return {
      message: 'Financial report retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('sales-report')
  @ApiOperation({
    summary:
      'Get sales report data for the main dashboard within a date range.',
  })
  async getSalesReport(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Query('type') type: SalesReportType,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getSalesReport(
      startDate,
      endDate,
      type,
      req,
    );
    return {
      message: 'Sales report retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('voucher-report')
  @ApiOperation({
    summary:
      'Get voucher report data for the main dashboard within a date range.',
  })
  async getVoucherReport(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getVoucherReport(
      startDate,
      endDate,
      req,
    );
    return {
      message: 'Voucher report retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('stock-report')
  @ApiOperation({
    summary:
      'Get stock report data for the main dashboard within a date range.',
  })
  async getStockReport(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Query('type') type: StockReportType,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getStockReport(
      startDate,
      endDate,
      type,
      req,
    );
    return {
      message: 'Stock report retrieved successfully',
      result: toCamelCase(data),
    };
  }
}
