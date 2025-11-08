// Di dalam file report.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AdvancedSalesReportType,
  IBenefitDashboard,
  IExpiryDashboard,
  InventoryReportType,
  LoyaltyReportType,
  NewFinancialReportType,
  ReportService,
  StaffReportType,
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

  async generateInventoryReportPdf(
    startDateString: Date,
    endDateString: Date,
    type: InventoryReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    const data = await this.reportService.getInventoryValuation(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
    );

    // 2. Siapkan variabel untuk template
    let templateData: any;

    // 3. Ambil data header umum
    const commonReportData = await this.getCommonReportData(
      `Inventory Report - ${type}`, // Nama dinamis
      undefined, // Laporan inventaris tidak difilter per staf
      req,
      storeIdsString,
      startDateString,
      endDateString,
    );

    // 4. Transformasi data berdasarkan tipenya
    switch (type) {
      case 'movement-ledger': {
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Tanggal', value: 'tanggal' },
            { label: 'Item Name', value: 'itemName' },
            { label: 'Adjustment Type', value: 'adjustmentType' },
            { label: 'Adj. Qty', value: 'adjustmentQuantity' },
            { label: 'New Stock', value: 'newStockQuantity' },
            { label: 'Notes', value: 'notes' },
          ],
          tableData: data as any[],
          // Tidak ada overall summary
        };
        break;
      }

      case 'current-stock-overview': {
        // Laporan ini bukan tabel, tapi RECAP.
        // Kita akan 'memaksa' data widget agar sesuai dengan format template
        const widgetData = data as {
          totalOnHand: number;
          totalStockCost: number;
          averageStockCost: number;
          totalRetailPrice: number;
        };

        templateData = {
          reportData: commonReportData,
          // Gunakan 'recapWidget' dari template
          recapWidget: {
            'Total On-Hand': widgetData.totalOnHand,
            'Total Stock Cost': `Rp ${widgetData.totalStockCost.toLocaleString('id-ID')}`,
            'Avg. Stock Cost': `Rp ${widgetData.averageStockCost.toLocaleString('id-ID')}`,
            'Total Retail Price': `Rp ${widgetData.totalRetailPrice.toLocaleString('id-ID')}`,
          },
          columns: [], // Tidak ada tabel
          tableData: [], // Tidak ada tabel
        };
        break;
      }

      case 'po-receiving-variance': {
        // Hitung total secara manual
        const poData = data as any[];
        const totalVariance = poData.reduce(
          (acc, item) => acc + item.var_price,
          0,
        );

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'PO Number', value: 'poId' },
            { label: 'Item', value: 'item' },
            { label: 'Qty PO', value: 'qtyPO' },
            { label: 'Qty Aktual', value: 'qtyAktual' },
            { label: 'Qty Selisih', value: 'qtySelisih' },
            { label: 'Item Price', value: 'itemPrice' },
            { label: 'Variance Price', value: 'var_price' },
          ],
          tableData: poData,
          overallSummary: {
            var_price: totalVariance, // Tampilkan total di kolom 'Variance Price'
          },
        };
        break;
      }

      case 'slow-dead-stock': {
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Item', value: 'item' },
            { label: 'On-Hand Qty', value: 'onHand' },
            { label: 'Last Stock Update', value: 'lastStockUpdated' },
            { label: 'Days Idle', value: 'daysIdle' },
          ],
          tableData: data as any[],
        };
        break;
      }

      case 'item-performance': {
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Item Name', value: 'itemName' },
            { label: 'Stock Qty', value: 'stockQty' },
            { label: 'Total Stock Value', value: 'totalStockValue' },
            { label: 'Total Movements', value: 'totalMovementsCount' },
            { label: 'Total Qty Out', value: 'totalQtyOut' },
          ],
          tableData: data as any[],
        };
        break;
      }

      case 'item-performance-by-category': {
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Category', value: 'category' },
            { label: 'Item Count', value: 'itemCount' },
            { label: 'Total Stock Value', value: 'totalStockValue' },
            { label: 'Total Movements', value: 'totalMovementsCount' },
            { label: 'Total Qty Out', value: 'totalQtyOut' },
          ],
          tableData: data as any[],
        };
        break;
      }

      case 'item-performance-by-brand': {
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Brand', value: 'brand' },
            { label: 'Item Count', value: 'itemCount' },
            { label: 'Total Stock Value', value: 'totalStockValue' },
            { label: 'Total Movements', value: 'totalMovementsCount' },
            { label: 'Total Qty Out', value: 'totalQtyOut' },
          ],
          tableData: data as any[],
        };
        break;
      }

      default:
        throw new BadRequestException(`Invalid report type: ${type}`);
    }

    // 5. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateVoucherReportPdf(
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    // 1. Ambil Data JSON dari fungsi yang sudah ada
    // 'data' adalah array: [{ voucherName, promoCode, ... }, ...]
    const data = await this.reportService.getVoucherStatusReport(
      req,
      storeIdsString,
    );

    // 2. Ambil Data Header
    const commonReportData = await this.getCommonReportData(
      'Voucher Status Report',
      undefined,
      req,
      storeIdsString,
      undefined,
      undefined,
    );

    const columns = [
      { label: 'Voucher Name', value: 'voucherName' },
      { label: 'Promo Code', value: 'promoCode' },
      { label: 'Validity Period', value: 'validityPeriod' },
      { label: 'Status', value: 'status' },
      { label: 'Total Quota', value: 'totalQuota' },
      { label: 'Total Usage', value: 'totalUsage' },
      { label: 'Remaining Quota', value: 'remainingQuota' },
    ];

    // 4. Susun data akhir untuk template
    const templateData = {
      reportData: commonReportData,
      columns: columns,
      tableData: data,
      // Tidak ada overallSummary untuk laporan ini
    };

    // 5. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateStaffReportPdf(
    startDateString: Date,
    endDateString: Date,
    type: StaffReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    // 1. Panggil FUNGSI PUBLIK untuk mendapatkan data JSON
    const data = await this.reportService.getStaffReports(
      startDateString,
      endDateString,
      type,
      req,
      storeIdsString,
    );

    // 2. Siapkan variabel
    let templateData: any;

    // 3. Ambil data header umum
    const commonReportData = await this.getCommonReportData(
      `Staff Report - ${type}`,
      undefined, // Laporan ini tidak difilter per staf
      req,
      storeIdsString,
      startDateString,
      endDateString,
    );

    // 4. Transformasi data berdasarkan tipenya
    switch (type) {
      case 'attendance-summary': {
        // 'data' di sini adalah: { totalStaff: number, staff: any[] }
        const attendanceData = data as { totalStaff: number; staff: any[] };

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Name', value: 'name' },
            { label: 'Email', value: 'email' },
            { label: 'Title', value: 'title' },
            { label: 'Start Date', value: 'start_date' },
          ],
          tableData: attendanceData.staff,
        };
        break;
      }

      case 'commission-summary': {
        // 'data' di sini adalah: { summary: {...}, details: [...] }
        const commissionData = data as { summary: any; details: any[] };

        templateData = {
          reportData: commonReportData,
          columns: [], // Tidak ada tabel untuk 'summary'
          tableData: [], // Tidak ada tabel
        };
        break;
      }

      case 'commission-details': {
        // 'data' di sini juga: { summary: {...}, details: [...] }
        const commissionData = data as { summary: any; details: any[] };

        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Staff Name', value: 'staffName' },
            {
              label: 'Total Product Commission',
              value: 'totalProductCommission',
            },
            {
              label: 'Total Voucher Commission',
              value: 'totalVoucherCommission',
            },
            { label: 'Total Commission', value: 'totalCommission' },
          ],
          tableData: commissionData.details,
          overallSummary: {
            totalProductCommission: commissionData.summary.totalKomisiProduk,
            totalVoucherCommission:
              commissionData.summary.totalVoucherCommission,
            totalCommission: commissionData.summary.totalNilaiKomisi,
          },
        };
        break;
      }

      default:
        throw new BadRequestException(`Invalid report type: ${type}`);
    }

    // 5. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateLoyaltyReportPdf(
    type: LoyaltyReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    // 1. Panggil FUNGSI PUBLIK untuk mendapatkan data JSON
    // (Berdasarkan kode Anda, fungsi ini tidak memerlukan tanggal)
    const data = await this.reportService.getLoyaltyReport(
      type,
      req,
      storeIdsString,
    );

    // 2. Siapkan variabel
    let templateData: any;

    // 3. Ambil data header umum (tanpa tanggal)
    const commonReportData = await this.getCommonReportData(
      `Loyalty Report - ${type}`,
      undefined, // staffId
      req,
      storeIdsString,
      undefined, // startDate
      undefined, // endDate
    );

    // 4. Transformasi data berdasarkan tipenya
    // Semua tipe laporan loyalitas Anda mengembalikan: { dashboard: ..., table: [...] }
    // Kita hanya perlu mendefinisikan kolom dan recapWidget untuk setiap 'case'

    switch (type) {
      case 'spend-based': {
        const report = data as { dashboard: any; table: any[] };
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Invoice ID', value: 'invoiceId' },
            { label: 'Tanggal', value: 'purchaseDate' },
            { label: 'Pelanggan', value: 'customer' },
            { label: 'Grand Total', value: 'grandTotal' },
            { label: 'Poin Didapat', value: 'totalPointsEarned' },
            { label: 'Tgl Hangus', value: 'pointExpiryDate' },
          ],
          tableData: report.table,
        };
        break;
      }

      case 'product-based': {
        const report = data as { dashboard: any; table: any[] };
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Produk', value: 'productName' },
            { label: 'Harga', value: 'productPrice' },
            { label: 'Poin/IDR', value: 'pointsToIDR' },
            { label: 'Total Poin Diberikan', value: 'sumOfPointsGivenToCust' },
            { label: 'Total Pelanggan', value: 'totalCust' },
          ],
          tableData: report.table,
        };
        break;
      }

      case 'benefit-utilization': {
        // Asumsi IBenefitDashboard diimpor
        const report = data as { dashboard: IBenefitDashboard; table: any[] };
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Nama Benefit', value: 'benefitName' },
            { label: 'Tipe', value: 'type' },
            { label: 'Jumlah Dipakai', value: 'countUsed' },
            { label: 'Total Poin Dipakai', value: 'totalPointUsed' },
            { label: 'Jumlah (Rp/Qty)', value: 'amount' },
          ],
          tableData: report.table,
        };
        break;
      }

      case 'expiry-warning': {
        // Asumsi IExpiryDashboard diimpor
        const report = data as { dashboard: IExpiryDashboard; table: any[] };
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Pelanggan', value: 'custName' },
            { label: 'Invoice', value: 'invoice' },
            { label: 'Tipe Poin', value: 'type' },
            { label: 'Poin', value: 'points' },
            { label: 'Tanggal Hangus', value: 'expiryDate' },
          ],
          tableData: report.table,
        };
        break;
      }

      case 'type-accumulation': {
        const report = data as { dashboard: any; table: any[] };
        templateData = {
          reportData: commonReportData,
          columns: [
            { label: 'Tipe Poin', value: 'type' },
            { label: 'Total Poin Didapat', value: 'sumTotalPoints' },
            { label: 'Total Pelanggan', value: 'totalCustomers' },
          ],
          tableData: report.table,
        };
        break;
      }

      default:
        throw new BadRequestException(`Invalid report type: ${type}`);
    }

    // 5. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }

  async generateCustomerReportPdf(
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    // 1. Ambil Data JSON dari fungsi yang sudah ada
    // 'data' adalah array: [{ nama, gender, totalSales, ... }, ...]
    const data = await this.reportService.getCustomerReport(
      req,
      storeIdsString,
    );

    // 2. Ambil Data Header
    // (Helper getCommonReportData sudah kita ubah agar tanggal opsional)
    const commonReportData = await this.getCommonReportData(
      'Customer Report',
      undefined, // staffId (tidak ada)
      req,
      storeIdsString,
      undefined, // startDate (tidak ada)
      undefined, // endDate (tidak ada)
    );

    // 3. Definisikan Kolom
    // 'value' harus cocok dengan nama properti dari 'getCustomerReport'
    const columns = [
      { label: 'Name', value: 'nama' },
      { label: 'Gender', value: 'gender' },
      { label: 'Total Sales', value: 'totalSales' },
      { label: 'Date Added', value: 'dateAdded' },
      { label: 'Outstanding', value: 'outstanding' },
      { label: 'Loyalty Points', value: 'loyaltyPoints' },
    ];

    // 4. [OPSIONAL TAPI DIREKOMENDASIKAN] Hitung Total untuk Baris Summary
    const totals = data.reduce(
      (acc, customer) => {
        acc.totalSales += customer.totalSales;
        acc.outstanding += customer.outstanding;
        acc.loyaltyPoints += customer.loyaltyPoints;
        return acc;
      },
      { totalSales: 0, outstanding: 0, loyaltyPoints: 0 },
    );

    // 5. Susun data akhir untuk template
    const templateData = {
      reportData: commonReportData,
      columns: columns,
      tableData: data,
      overallSummary: {
        // 'nama' (kolom pertama) akan diisi 'TOTAL' oleh template
        totalSales: totals.totalSales,
        outstanding: totals.outstanding,
        loyaltyPoints: totals.loyaltyPoints,
      },
    };

    // 6. Hasilkan PDF
    return this.generatePdfFromTemplate('table-report', templateData);
  }
}
