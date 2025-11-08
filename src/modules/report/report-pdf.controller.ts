import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { PDFReportService } from './report-pdf.service';
import {
  AdvancedSalesReportType,
  InventoryReportType,
  LoyaltyReportType,
  NewFinancialReportType,
  StaffReportType,
} from './report.service';

@Controller('generate/pdf')
export class PDFReportController {
  constructor(private readonly reportService: PDFReportService) {}

  @Get('financial-report')
  @ApiOperation({
    summary: 'Export financial report to PDF.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async exportFinancialReport(
    @Query('startDate') startDateString: Date,
    @Query('endDate') endDateString: Date,
    @Query('type') type: NewFinancialReportType,
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
    @Query('staff_id') staffId?: string,
  ) {
    const pdfBuffer = await this.reportService.generateFinancialReportPdf(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
      staffId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=financial-report.pdf',
    );
    res.send(pdfBuffer);
  }

  @Get('advanced-sales-report')
  @ApiOperation({
    summary: 'Export advanced sales report to PDF.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async exportAdvancedSalesReportPDF(
    @Query('startDate') startDateString: Date,
    @Query('endDate') endDateString: Date,
    @Query('type') type: AdvancedSalesReportType,
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
    @Query('staff_id') staffId?: string,
  ) {
    const pdfBuffer = await this.reportService.generateAdvancedSalesReportPdf(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
      staffId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales-report.pdf',
    );

    res.send(pdfBuffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID (digunakan jika store_ids tidak ada)',
  })
  @ApiBearerAuth()
  @Get('inventory-report')
  @ApiOperation({
    summary: 'Export inventory report to PDF.',
  })
  async exportInventoryReport(
    @Query('startDate') startDateString: Date,
    @Query('endDate') endDateString: Date,
    @Query('type') type: InventoryReportType,
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const pdfBuffer = await this.reportService.generateInventoryReportPdf(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
    );

    // Set header untuk 'langsung download'
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=inventory-report.pdf',
    );
    res.send(pdfBuffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID (digunakan jika store_ids tidak ada)',
  })
  @ApiBearerAuth()
  @Get('voucher-report')
  @ApiOperation({
    summary: 'Export voucher status report to PDF.',
  })
  async exportVoucherReport(
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const pdfBuffer = await this.reportService.generateVoucherReportPdf(
      req,
      storeIdsString,
    );

    // Set header untuk 'langsung download'
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=voucher-report.pdf',
    );
    res.send(pdfBuffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID (digunakan jika store_ids tidak ada)',
  })
  @ApiBearerAuth()
  @Get('staff-report') // Rute PDF baru
  @ApiOperation({
    summary: 'Export staff report to PDF.',
  })
  async exportStaffReport(
    @Query('startDate') startDateString: Date,
    @Query('endDate') endDateString: Date,
    @Query('type') type: StaffReportType,
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const pdfBuffer = await this.reportService.generateStaffReportPdf(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
    );

    // Set header untuk 'langsung download'
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=staff-report.pdf',
    );
    res.send(pdfBuffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID (digunakan jika store_ids tidak ada)',
  })
  @ApiBearerAuth()
  @Get('loyalty-report')
  @ApiOperation({
    summary: 'Export loyalty report to PDF.',
  })
  async exportLoyaltyReport(
    @Query('type') type: LoyaltyReportType,
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const pdfBuffer = await this.reportService.generateLoyaltyReportPdf(
      type,
      req,
      storeIdsString,
    );

    // Set header untuk 'langsung download'
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=loyalty-report.pdf',
    );
    res.send(pdfBuffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID (digunakan jika store_ids tidak ada)',
  })
  @ApiBearerAuth()
  @Get('customer-report')
  @ApiOperation({
    summary: 'Export customer report to PDF.',
  })
  async exportCustomerReport(
    @Res() res: Response,
    @Req() req: ICustomRequestHeaders,
    @Query('store_ids') storeIdsString?: string,
  ) {
    const pdfBuffer = await this.reportService.generateCustomerReportPdf(
      req,
      storeIdsString,
    );

    // Set header untuk 'langsung download'
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=customer-report.pdf',
    );
    res.send(pdfBuffer);
  }
}
