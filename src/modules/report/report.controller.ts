import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  AdvancedSalesReportType,
  InventoryReportType,
  LoyaltyReportType,
  NewFinancialReportType,
  ReportService,
  StaffReportType,
} from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

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
    summary: 'Get summary data for the main dashboard within a date range.',
  })
  async getDashboardSummary(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('type') type: NewFinancialReportType,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
    @Query('staff_ids') staffId?: string,
  ) {
    const data = await this.reportService.getNewFinancialReports(
      startDate,
      endDate,
      type,
      req,
      storeIdsString,
      staffId,
    );
    return {
      message: 'Financial summary retrieved successfully',
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
  @Get('advanced-sales-report')
  @ApiOperation({
    summary:
      'Get advanced sales report data for the main dashboard within a date range.',
  })
  async getAdvancedSalesReport(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('type') type: AdvancedSalesReportType,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
    @Query('staff_ids') staffId?: string,
  ) {
    const data = await this.reportService.getAdvancedSalesReport(
      startDate,
      endDate,
      type,
      req,
      storeIdsString,
      staffId,
    );
    return {
      message: 'Advanced sales report data retrieved successfully',
      result: data,
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
  @Get('inventory-valuation')
  @ApiOperation({
    summary:
      'Get inventory valuation report data for the main dashboard within a date range.',
  })
  async getInventoryValuation(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('type') type: InventoryReportType,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const data = await this.reportService.getInventoryValuation(
      startDate,
      endDate,
      type,
      req,
      storeIdsString,
    );
    return {
      message: 'Inventory data retrieved successfully',
      result: data,
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
  @Get('voucher-status-report')
  @ApiOperation({
    summary:
      'Get inventory valuation report data for the main dashboard within a date range.',
  })
  async getVoucherStatusReport(
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIds?: string,
  ) {
    const data = await this.reportService.getVoucherStatusReport(req, storeIds);
    return {
      message: 'Voucher status report data retrieved successfully',
      result: data,
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
  @Get('staff-report')
  @ApiOperation({
    summary:
      'Get staff report data for the main dashboard within a date range.',
  })
  async getStaffReport(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('type') type: StaffReportType,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIds?: string,
  ) {
    const data = await this.reportService.getStaffReports(
      startDate,
      endDate,
      type,
      req,
      storeIds,
    );
    return {
      message: 'Staff report data retrieved successfully',
      result: data,
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
  @Get('customer-report')
  @ApiOperation({
    summary:
      'Get customer report data for the main dashboard within a date range.',
  })
  async getLoyaltyReport(
    @Query('type') type: LoyaltyReportType,
    @Query('store_ids') storeIdsString: string,
  ) {
    const data = await this.reportService.getLoyaltyReport(
      type,
      storeIdsString,
    );
    return {
      message: 'Loyalty report data retrieved successfully',
      result: data,
    };
  }
}
