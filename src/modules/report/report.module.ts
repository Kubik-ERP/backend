import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PDFReportController } from './report-pdf.controller';
import { PDFReportService } from './report-pdf.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController, PDFReportController],
  providers: [ReportService, PDFReportService],
})
export class ReportModule {}
