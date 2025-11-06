// Di dalam file report.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AdvancedSalesReportType,
  NewFinancialReportType,
  ReportService,
} from './report.service';

@Injectable()
export class PDFReportService {
  constructor(
    private readonly reportService: ReportService,
    private readonly prisma: PrismaService,
  ) {
    handlebars.registerHelper('lookup', (obj, field) => {
      return obj && obj[field];
    });

    // Registrasi helper format angka
    handlebars.registerHelper('formatNumber', (value) => {
      if (typeof value !== 'number') return value;
      return Math.round(value).toLocaleString('id-ID');
    });
  }

  async generatePdfFromTemplate(
    templateName: string,
    data: any,
  ): Promise<Buffer> {
    // 1. Baca dan kompilasi template Handlebars
    const templateHtml = fs.readFileSync(
      path.join(
        process.cwd(),
        `src/modules/report/template-pdf/${templateName}.hbs`,
      ),
      'utf8',
    );
    const template = handlebars.compile(templateHtml);

    // 2. Masukkan data ke HTML (tambahkan 'options' ke data)
    const finalHtml = template({ ...data });

    // 3. Luncurkan Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

    // 4. Hasilkan PDF
    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: 'A4',
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  }

  private async getCommonReportData(
    reportName: string,
    staffId: string | undefined,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const now = new Date();
    let storeIds: string[];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }
    const store = await this.prisma.stores.findMany({
      where: { id: { in: storeIds } },
    });
    let staff = 'All Staff Member';
    if (staffId) {
      const staff = await this.prisma.users.findFirst({
        where: { id: +staffId },
      });
    }
    const storeDetails = {
      name: store.map((s) => s.name).join(', '),
      address: store.map((s) => s.address).join(' | '),
    };
    return {
      reportName: reportName,
      storeName: storeIds.length > 1 ? 'All Stores' : `${storeDetails.name}`,
      storeAddress:
        storeIds.length > 1 ? `All Stores` : `${storeDetails.address}`,
      staffMember: staffId === 'all' || !staffId ? 'All Staff' : `${staff}`,
      period:
        startDate && endDate
          ? `${startDate.toString().substring(0, 10)} - ${endDate.toString().substring(0, 10)}`
          : 'N/A',
      printDate: now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      printTime: now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  async generateFinancialReportPdf(
    startDateString: Date,
    endDateString: Date,
    type: NewFinancialReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
    staffId?: string,
  ) {
    const data = await this.reportService.getNewFinancialReports(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
      staffId,
    );

    // 2. Transformasi Data (Contoh untuk 'payment-summary')
    let templateData: any;

    const commonReportData = await this.getCommonReportData(
      `Financial Report - ${type}`,
      staffId,
      req,
      storeIdsString,
      startDateString,
      endDateString,
    );

    switch (type) {
      case 'payment-summary': {
        // TypeScript Cerdas: Di dalam blok ini, ia tahu 'data' adalah tipe 'payment-summary'
        // Kita gunakan Type Assertion (as) untuk memastikannya.
        const paymentData = data as {
          // simpleWidget: any;
          paymentList: { reportData: any[]; totals: any };
        };

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Payment Method', value: 'paymentMethod' },
            { label: 'Transactions', value: 'transaction' },
            { label: 'Nominal', value: 'nominal' },
          ],
          // recapWidget: paymentData.simpleWidget,
          tableData: paymentData.paymentList.reportData,
          overallSummary: {
            transaction: paymentData.paymentList.totals.transaction,
            nominal: paymentData.paymentList.totals.nominal,
          },
        };
        break;
      }

      case 'financial-summary': {
        const financialData = data as { sales: Record<string, number> };

        const tableData = Object.entries(financialData.sales).map(
          ([key, value]) => ({
            metric: key,
            value: value,
          }),
        );

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Metric', value: 'metric' },
            { label: 'Value', value: 'value' },
          ],
          tableData: tableData,
        };
        break;
      }

      case 'discount-summary': {
        const discountData = data as {
          discountList: any[];
        };

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Nama/Invoice', value: 'nama' },
            { label: 'Nilai Barang', value: 'nilaiBarang' },
            { label: 'Jumlah Diskon', value: 'jumlahDiskon' },
          ],
          tableData: discountData.discountList,
        };
        break;
      }
      case 'tax-and-service-summary': {
        const taxData = data as {
          type: string;
          rate: number;
          subtotalApplied: number;
          nominal: number;
        }[];

        // Hitung total secara manual
        const totalNominal = taxData.reduce(
          (acc, item) => acc + item.nominal,
          0,
        );
        const totalSubtotal = taxData.reduce(
          (acc, item) => acc + item.subtotalApplied,
          0,
        );

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Type', value: 'type' },
            { label: 'Rate', value: 'rate' },
            { label: 'Subtotal Applied', value: 'subtotalApplied' },
            { label: 'Nominal', value: 'nominal' },
          ],
          tableData: taxData,
          overallSummary: {
            subtotalApplied: totalSubtotal,
            nominal: totalNominal,
          },
        };
        break;
      }

      default:
        throw new BadRequestException(`Invalid report type: ${type}`);
    }
    // 3. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateAdvancedSalesReportPdf(
    startDateString: Date,
    endDateString: Date,
    type: AdvancedSalesReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
    staffId?: string,
  ) {
    const data = await this.reportService.getAdvancedSalesReport(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
      staffId,
    );

    // 2. Ambil Data Header
    const commonReportData = await this.getCommonReportData(
      `Advanced Sales Report - By ${type}`,
      staffId,
      req,
      storeIdsString,
      startDateString,
      endDateString,
    );

    // 3. Definisikan Kolom untuk Template
    // Nama 'value' harus cocok dengan properti di 'overallSummary' & 'groupedSummary'
    const columns = [
      { label: 'Group', value: 'group' }, // 'group' akan diisi 'TOTAL' di summary
      { label: 'Qty Sold', value: 'jumlahTerjual' },
      { label: 'Gross Sales', value: 'kotor' },
      { label: 'Discount', value: 'diskonItem' },
      { label: 'Tax', value: 'pajak' },
      { label: 'Service Charge', value: 'biayaLayanan' }, // Anda sudah menambahkannya
      { label: 'Nett Sales', value: 'totalPenjualan' },
      { label: 'Voucher Used', value: 'countPenggunaanVoucher' },
    ];

    // 4. Susun data akhir untuk template
    const templateData = {
      reportData: commonReportData,
      columns: columns,
      tableData: data.groupedSummary,
      overallSummary: data.overallSummary, // Template .hbs akan otomatis menanganinya
    };

    // 5. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateSalesReportPDF(
    startDateString: Date,
    endDateString: Date,
    type: AdvancedSalesReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
    staffId?: string,
  ) {
    const reportData = await this.reportService.getAdvancedSalesReport(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
      staffId,
    );
    let storeIds: string[];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }
    const store = await this.prisma.stores.findMany({
      where: { id: { in: storeIds } },
    });

    const storeDetails = {
      name: store.map((s) => s.name).join(', '),
      address: store.map((s) => s.address).join(' | '),
    };
    const staffDetails = { name: 'All Staff Member' };

    // PERBAIKAN #2: Susun ulang 'templateData' agar cocok dengan template
    const now = new Date();
    const templateData = {
      reportData: {
        reportName: 'Sales Report - Sales By Items Report',
        storeName: storeDetails.name,
        storeAddress: storeDetails.address,
        staffMember: staffDetails.name,
        //get date only from datetime string
        period: `${startDateString.toString().substring(0, 10)} - ${endDateString.toString().substring(0, 10)}`,
        printDate: now.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        printTime: now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },

      // Data tabel (ini sudah benar)
      groupedSummary: reportData.groupedSummary,
      overallSummary: reportData.overallSummary,
    };

    // 3. Baca dan kompilasi template Handlebars
    const templateHtml = fs.readFileSync(
      path.join(
        process.cwd(),
        'src/modules/report/template-pdf/sales-report.hbs',
      ),
      'utf8',
    );
    const template = handlebars.compile(templateHtml);

    // 4. Masukkan data ke HTML
    const finalHtml = template(templateData);

    // 5. Luncurkan Puppeteer dan buat PDF
    const browser = await puppeteer.launch({
      headless: true, // Jalankan di background
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Wajib untuk server Linux/Docker
    });
    const page = await browser.newPage();

    // Set konten halaman
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

    // Hasilkan PDF sebagai buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Wajib agar CSS background ikut tercetak
    });

    await browser.close();

    // 6. Kembalikan buffer (data mentah PDF)
    return pdfBuffer;
  }
}
