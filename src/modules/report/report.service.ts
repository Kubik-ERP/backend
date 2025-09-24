import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type NewFinancialReportType =
  | 'financial-summary'
  | 'payment-summary'
  | 'discount-summary'
  | 'tax-and-service-summary';

export type AdvancedSalesReportType =
  | 'item'
  | 'category'
  | 'store'
  | 'customer'
  | 'staff'
  | 'day'
  | 'month'
  | 'quarter'
  | 'year'
  | 'variant';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}
  private async getPaymentMethodData(
    begDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const paymentData = await this.prisma.invoice.findMany({
      where: {
        paid_at: {
          gte: begDate,
          lte: endDate,
        },
        store_id: req.store_id,
      },
      include: {
        payment_methods: true,
      },
    });
    const report = new Map<string, { transaction: number; nominal: number }>();

    for (const invoice of paymentData) {
      if (invoice.payment_methods && invoice.payment_methods.name) {
        const methodName = invoice.payment_methods.name;
        const amount = invoice.grand_total || 0;

        if (!report.has(methodName)) {
          report.set(methodName, { transaction: 0, nominal: 0 });
        }

        const currentTotals = report.get(methodName)!;
        currentTotals.transaction += 1;
        currentTotals.nominal += amount;
      }
    }

    const reportData = Array.from(report.entries()).map(([method, data]) => ({
      paymentMethod: method,
      transaction: data.transaction,
      nominal: data.nominal,
    }));

    const totals = reportData.reduce(
      (acc, item) => {
        acc.transaction += item.transaction;
        acc.nominal += item.nominal;
        return acc;
      },
      { transaction: 0, nominal: 0 },
    );

    return { reportData, totals };
  }

  private async getTaxAndServiceChargeReport(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const aggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: req.store_id,
        paid_at: {
          gte: startDate,
          lte: endDate,
          not: null,
        },
      },
      _sum: {
        subtotal: true,
        tax_amount: true,
        service_charge_amount: true,
      },
    });

    const chargeDetails = await this.prisma.charges.findMany({
      where: {
        store_id: req.store_id,
        type: { in: ['tax', 'service'] },
      },
    });

    const taxInfo = chargeDetails.find((c) => c.type === 'tax');
    const serviceInfo = chargeDetails.find((c) => c.type === 'service');

    const reportData = [
      {
        type: 'Tax',
        rate: taxInfo ? Number(taxInfo.percentage) * 100 : 0,
        subtotalApplied: aggregation._sum.subtotal || 0,
        nominal: aggregation._sum.tax_amount || 0,
      },
      {
        type: 'Service Charge',
        rate: serviceInfo ? Number(serviceInfo.percentage) * 100 : 0,
        subtotalApplied: aggregation._sum.subtotal || 0,
        nominal: aggregation._sum.service_charge_amount || 0,
      },
    ];

    return reportData;
  }

  private async getFinancialSummary(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    // Agregasi utama untuk data invoice
    const invoiceAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        subtotal: true,
        discount_amount: true,
        tax_amount: true,
        grand_total: true,
      },
    });

    // Agregasi untuk penggunaan voucher secara spesifik
    const voucherUsageAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        voucher_id: { not: null },
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        discount_amount: true,
      },
    });

    // Agregasi untuk invoice yang belum dibayar (outstanding)
    const outstandingAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'unpaid',
        created_at: {
          // Asumsi: outstanding dihitung berdasarkan kapan dibuat
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        grand_total: true,
      },
    });

    const grossSales = invoiceAggregation._sum.subtotal || 0;
    const discount = invoiceAggregation._sum.discount_amount || 0;
    const netSales = grossSales - discount;
    const tax = invoiceAggregation._sum.tax_amount || 0;
    const nettTotal = invoiceAggregation._sum.grand_total || 0;

    return {
      sales: {
        penjualanKotor: grossSales,
        diskon: discount,
        refund: 0,
        penjualanBersih: netSales,
        pajak: tax,
        pembulatan: 0,
        penggunaanVoucher: voucherUsageAggregation._sum.discount_amount || 0,
        nettTotal: nettTotal,
      },
      paymentType: {
        total: nettTotal,
        refund: 0,
        outstanding: outstandingAggregation._sum.grand_total || 0,
      },
    };
  }

  private async getPaymentSummary(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    // Ambil data untuk widget ringkasan
    const summaryAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        subtotal: true, // Pendapatan kotor
        grand_total: true, // Nett summary
      },
    });

    // Ambil data voucher usage
    const voucherUsageAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        voucher_id: { not: null },
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        discount_amount: true,
      },
    });

    const paymentList = await this.getPaymentMethodData(
      startDate,
      endDate,
      req,
    );

    return {
      simpleWidget: {
        totalTransaksi: summaryAggregation._count.id || 0,
        pendapatanKotor: summaryAggregation._sum.subtotal || 0,
        totalRefund: 0,
        totalPenggunaanVoucher:
          voucherUsageAggregation._sum.discount_amount || 0,
        nettSummary: summaryAggregation._sum.grand_total || 0,
      },
      paymentList: paymentList,
    };
  }

  /**
   * Mengambil ringkasan diskon.
   * Termasuk widget ringkasan dan daftar transaksi dengan diskon.
   */
  private async getDiscountSummary(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    // Ambil data untuk widget
    const discountAggregation = await this.prisma.invoice.aggregate({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        total_product_discount: {
          gt: 0,
        },
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total_product_discount: true,
        subtotal: true,
      },
    });

    // Ambil daftar invoice yang memiliki diskon
    const discountedInvoices = await this.prisma.invoice.findMany({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        total_product_discount: {
          gt: 0,
        },
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        invoice_number: true,
        subtotal: true,
        total_product_discount: true,
      },
    });

    return {
      simpleWidget: {
        totalJumlahDiskon: discountAggregation._sum.total_product_discount || 0,
        totalItemValue: discountAggregation._sum.subtotal || 0,
      },
      discountList: discountedInvoices.map((inv) => ({
        nama: inv.invoice_number,
        nilaiBarang: inv.subtotal,
        jumlahDiskon: inv.total_product_discount,
      })),
    };
  }

  async getNewFinancialReports(
    startDate: Date,
    endDate: Date,
    type: NewFinancialReportType,
    req: ICustomRequestHeaders,
  ) {
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    switch (type) {
      case 'financial-summary':
        return this.getFinancialSummary(startDate, endDate, req);
      case 'payment-summary':
        return this.getPaymentSummary(startDate, endDate, req);
      case 'discount-summary':
        return this.getDiscountSummary(startDate, endDate, req);
      case 'tax-and-service-summary':
        return this.getTaxAndServiceChargeReport(startDate, endDate, req);
      default:
        throw new BadRequestException('Invalid report type provided');
    }
  }

  private async getProcessedSalesData(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
    groupBy: AdvancedSalesReportType,
  ) {
    // 1. Ambil semua detail invoice dalam rentang waktu dengan relasi yang dibutuhkan
    const invoiceDetails = await this.prisma.invoice_details.findMany({
      where: {
        invoice: {
          store_id: req.store_id,
          payment_status: 'paid',
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        products: {
          include: {
            // Asumsi relasi ini ada untuk mengambil kategori
            categories_has_products: {
              include: {
                categories: true,
              },
            },
            variant_has_products: {
              include: {
                variant: true,
              },
            },
          },
        },
        invoice: {
          include: {
            customer: true, // Asumsi relasi ke customer
            users: true,
            stores: true, // Asumsi relasi ke store
          },
        },
      },
    });

    // 2. Gunakan Map untuk mengelompokkan data (lebih efisien)
    const accumulator = new Map<
      string,
      {
        summary: {
          jumlahTerjual: number;
          kotor: number;
          diskonItem: number;
          refund: number;
          pajak: number;
          totalPenjualan: number;
          countPenggunaanVoucher: number;
        };
        details: any[];
        processedInvoices: Set<string>;
      }
    >();

    // 3. Iterasi setiap item yang terjual untuk diproses
    for (const item of invoiceDetails) {
      const invoice = item.invoice;
      const product = item.products;
      if (!invoice || !product) continue;

      let groupKey: string;
      switch (groupBy) {
        case 'item':
          groupKey = product.name ?? 'Unknown Item';
          break;
        case 'category':
          const category =
            product.categories_has_products[0]?.categories?.category;
          groupKey = category ?? 'Uncategorized';
          break;
        case 'store':
          groupKey = invoice.stores?.name ?? 'Unknown Store';
          break;
        case 'customer':
          groupKey = invoice.customer?.name ?? 'Guest Customer';
          break;
        case 'staff':
          groupKey = invoice.users?.fullname ?? 'No Staff';
          break;
        case 'day':
          groupKey = invoice.paid_at!.toISOString().split('T')[0];
          break;
        case 'month':
          groupKey = `${invoice.paid_at!.getFullYear()}-${String(invoice.paid_at!.getMonth() + 1).padStart(2, '0')}`; // Format: YYYY-MM
          break;
        case 'quarter':
          const month = invoice.paid_at!.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          groupKey = `${invoice.paid_at!.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          groupKey = String(invoice.paid_at!.getFullYear());
          break;
        case 'variant':
          // Asumsi ada properti variant di produk
          // groupKey = product.variant_name ?? 'No Variant';
          groupKey = 'Default Variant'; // Hapus ini jika ada variant
          break;
        default:
          groupKey = 'Overall';
      }

      // Inisialisasi jika grup belum ada di accumulator
      if (!accumulator.has(groupKey)) {
        accumulator.set(groupKey, {
          summary: {
            jumlahTerjual: 0,
            kotor: 0,
            diskonItem: 0,
            refund: 0,
            pajak: 0,
            totalPenjualan: 0,
            countPenggunaanVoucher: 0,
          },
          details: [],
          processedInvoices: new Set(),
        });
      }

      const groupData = accumulator.get(groupKey)!;

      // Kalkulasi
      const itemGross = (item.product_price ?? 0) * (item.qty ?? 1);

      // Kalkulasi prorata untuk diskon dan pajak
      let itemDiscount = 0;
      let itemTax = 0;
      if (invoice.subtotal > 0) {
        const itemPortion = itemGross / invoice.subtotal;
        itemDiscount = (invoice.discount_amount ?? 0) * itemPortion;
        itemTax = (invoice.tax_amount ?? 0) * itemPortion;
      }

      const itemTotal = itemGross - itemDiscount + itemTax;

      // Update summary
      groupData.summary.jumlahTerjual += item.qty ?? 1;
      groupData.summary.kotor += itemGross;
      groupData.summary.diskonItem += itemDiscount;
      // groupData.summary.refund += 0; // Logika refund jika ada
      groupData.summary.pajak += itemTax;
      groupData.summary.totalPenjualan += itemTotal;

      // Hitung penggunaan voucher sekali per faktur
      if (invoice.voucher_id && !groupData.processedInvoices.has(invoice.id)) {
        groupData.summary.countPenggunaanVoucher += 1;
        groupData.processedInvoices.add(invoice.id);
      }

      // Tambahkan data detail untuk tabel
      groupData.details.push({
        item: product.name,
        nomorFaktur: invoice.invoice_number,
        tgl: invoice.paid_at,
        // employee: invoice.employees?.name ?? 'N/A',
        customer: invoice.customer?.name ?? 'Guest',
        statusFaktur: invoice.payment_status,
        itemQty: item.qty,
      });
    }

    // 4. Ubah Map menjadi array sebagai hasil akhir
    const result = Array.from(accumulator.entries()).map(
      ([groupName, data]) => ({
        group: groupName,
        summary: data.summary,
        details: data.details,
      }),
    );

    return result;
  }

  async getAdvancedSalesReport(
    startDate: Date,
    endDate: Date,
    type: AdvancedSalesReportType,
    req: ICustomRequestHeaders,
  ) {
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    return this.getProcessedSalesData(startDate, endDate, req, type);
  }

  async getInventoryValuation(req: ICustomRequestHeaders) {
    const storeId = req.store_id;

    // 1. Ambil semua item inventaris untuk toko yang bersangkutan.
    // Sertakan juga data produk yang terhubung untuk mendapatkan harga retail.
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: storeId,
      },
      include: {
        // Relasi 'products' didefinisikan sebagai one-to-one opsional
        // dari master_inventory_items ke products
        products: {
          select: {
            price: true, // Hanya butuh harga retail dari produk
          },
        },
      },
    });

    // 2. Gunakan .reduce() untuk melakukan agregasi data secara efisien
    const summary = inventoryItems.reduce(
      (acc, item) => {
        const stockQuantity = item.stock_quantity || 0;
        const costPrice = Number(item.price_per_unit) || 0;

        // Harga retail diambil dari produk yang terhubung
        const retailPrice = item.products?.price || 0;

        acc.totalOnHand += stockQuantity;
        acc.totalStockCost += stockQuantity * costPrice;

        // Hanya hitung nilai retail jika item terhubung dengan produk yang punya harga
        if (retailPrice > 0) {
          acc.totalRetailValue += stockQuantity * retailPrice;
        }

        return acc;
      },
      {
        totalOnHand: 0,
        totalStockCost: 0,
        totalRetailValue: 0,
      },
    );

    // 3. Hitung biaya rata-rata per unit, hindari pembagian dengan nol
    const averageStockCost =
      summary.totalOnHand > 0
        ? summary.totalStockCost / summary.totalOnHand
        : 0;

    // 4. Kembalikan hasil dalam format yang diminta
    return {
      totalOnHand: summary.totalOnHand,
      totalStockCost: parseFloat(summary.totalStockCost.toFixed(2)),
      averageStockCost: parseFloat(averageStockCost.toFixed(2)),
      totalRetailPrice: parseFloat(summary.totalRetailValue.toFixed(2)),
    };
  }

  async getVoucherStatusReport(req: ICustomRequestHeaders) {
    const storeId = req.store_id;

    // 1. Ambil semua voucher untuk toko, dan hitung total invoice yang terhubung
    const vouchersWithUsage = await this.prisma.voucher.findMany({
      where: {
        store_id: storeId,
      },
      include: {
        // Gunakan _count untuk menghitung relasi secara efisien di database
        _count: {
          select: { invoice: true },
        },
      },
      orderBy: {
        name: 'asc', // Urutkan berdasarkan nama voucher
      },
    });

    const now = new Date(); // Dapatkan waktu saat ini untuk menentukan status

    // 2. Map hasil query ke format response yang diinginkan
    const report = vouchersWithUsage.map((voucher) => {
      const totalUsage = voucher._count.invoice;
      const quota = voucher.quota || 0;
      const remainingQuota = Math.max(0, quota - totalUsage); // Pastikan tidak negatif

      // Tentukan status voucher berdasarkan tanggal saat ini
      let status: 'Aktif' | 'Kedaluwarsa' | 'Akan Datang';
      const startDate = new Date(voucher.start_period);
      const endDate = new Date(voucher.end_period);
      // Set jam akhir ke ujung hari untuk perbandingan yang akurat
      endDate.setHours(23, 59, 59, 999);

      if (now < startDate) {
        status = 'Akan Datang';
      } else if (now > endDate) {
        status = 'Kedaluwarsa';
      } else {
        status = 'Aktif';
      }

      // Format tanggal untuk keterbacaan
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      };

      return {
        voucherName: voucher.name,
        promoCode: voucher.promo_code,
        validityPeriod: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        status: status,
        totalQuota: quota,
        totalUsage: totalUsage,
        remainingQuota: remainingQuota,
      };
    });

    return report;
  }
}
