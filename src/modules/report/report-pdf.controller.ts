import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { PDFReportService } from './report-pdf.service';
import {
  AdvancedSalesReportType,
  NewFinancialReportType,
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
}
