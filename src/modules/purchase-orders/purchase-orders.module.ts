import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { Reflector } from '@nestjs/core';
import { PDFReportService } from '../report/report-pdf.service';
import { ReportService } from '../report/report.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseOrdersController],
  providers: [
    PurchaseOrdersService,
    PDFReportService,
    ReportService,
    Reflector,
  ],
})
export class PurchaseOrdersModule {}
