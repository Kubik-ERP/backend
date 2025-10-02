import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

export type StaffReportType =
  | 'attendance-summary'
  | 'commission-summary'
  | 'commission-details';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}
  private async getPaymentMethodData(
    begDate: Date,
    endDate: Date,
    storeIds: string[],
    staffId: number | undefined,
  ) {
    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      paid_at: { gte: begDate, lte: endDate },
    };
    if (staffId !== undefined) {
      invoiceWhere.cashier_id = staffId;
    }
    const paymentData = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      where: {
        paid_at: {
          gte: begDate,
          lte: endDate,
        },
        store_id: { in: storeIds },
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
    storeIds: string[],
    staffId?: string,
  ) {
    let cashierId: number | undefined = undefined;
    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.employees.findUnique({
        where: { id: staffId },
        select: { user_id: true },
      });

      if (employee) {
        cashierId = employee.user_id;
      }
    }
    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      paid_at: {
        gte: startDate,
        lte: endDate,
        not: null,
      },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    const aggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: {
        subtotal: true,
        tax_amount: true,
        service_charge_amount: true,
      },
    });

    const chargeDetails = await this.prisma.charges.findMany({
      where: {
        store_id: { in: storeIds },
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
    storeIds: string[],
    staffId?: string,
  ) {
    let cashierId: number | undefined = undefined;
    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.employees.findUnique({
        where: { id: staffId },
        select: { user_id: true },
      });

      if (employee) {
        cashierId = employee.user_id;
      }
    }
    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      paid_at: { gte: startDate, lte: endDate },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    // Agregasi utama untuk data invoice
    const invoiceAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: {
        subtotal: true,
        discount_amount: true,
        tax_amount: true,
        grand_total: true,
      },
    });

    // Agregasi untuk penggunaan voucher secara spesifik
    const invoiceWhereVouch: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      voucher_id: { not: null },
      paid_at: { gte: startDate, lte: endDate },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    const voucherUsageAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhereVouch,
      _sum: {
        discount_amount: true,
      },
    });

    // Agregasi untuk invoice yang belum dibayar (outstanding)
    const invoiceWhereOutstanding: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'unpaid',
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    };
    const outstandingAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhereOutstanding,
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
    storeIds: string[],
    staffId?: string,
  ) {
    let cashierId: number | undefined = undefined;
    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.employees.findUnique({
        where: { id: staffId },
        select: { user_id: true },
      });

      if (employee) {
        cashierId = employee.user_id;
      }
    }
    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      paid_at: { gte: startDate, lte: endDate },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    // Ambil data untuk widget ringkasan
    const summaryAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhere,
      _count: {
        id: true,
      },
      _sum: {
        subtotal: true, // Pendapatan kotor
        grand_total: true, // Nett summary
      },
    });

    // Ambil data voucher usage
    const invoiceWhereVouch: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      voucher_id: { not: null },
      paid_at: { gte: startDate, lte: endDate },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    const voucherUsageAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhereVouch,
      _sum: {
        discount_amount: true,
      },
    });

    const paymentList = await this.getPaymentMethodData(
      startDate,
      endDate,
      storeIds,
      cashierId,
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
    storeIds: string[],
    staffId?: string,
  ) {
    let cashierId: number | undefined = undefined;
    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.employees.findUnique({
        where: { id: staffId },
        select: { user_id: true },
      });

      if (employee) {
        cashierId = employee.user_id;
      }
    }
    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      paid_at: { gte: startDate, lte: endDate },
      total_product_discount: {
        gt: 0,
      },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }
    // Ambil data untuk widget
    const discountAggregation = await this.prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: {
        total_product_discount: true,
        subtotal: true,
      },
    });

    // Ambil daftar invoice yang memiliki diskon
    const discountedInvoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
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
        totalItemWithDiscount: discountedInvoices.length,
      },
      discountList: discountedInvoices.map((inv) => ({
        nama: inv.invoice_number,
        nilaiBarang: inv.subtotal,
        jumlahDiskon: inv.total_product_discount,
      })),
    };
  }

  async getNewFinancialReports(
    startDateString: Date,
    endDateString: Date,
    type: NewFinancialReportType,
    storeIdsString: String,
    staffId?: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    if (!storeIdsString) {
      throw new BadRequestException('store_ids is required.');
    }
    const storeIds = storeIdsString.split(',');

    endDate.setHours(23, 59, 59, 999);
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    switch (type) {
      case 'financial-summary':
        return this.getFinancialSummary(startDate, endDate, storeIds, staffId);
      case 'payment-summary':
        return this.getPaymentSummary(startDate, endDate, storeIds, staffId);
      case 'discount-summary':
        return this.getDiscountSummary(startDate, endDate, storeIds, staffId);
      case 'tax-and-service-summary':
        return this.getTaxAndServiceChargeReport(
          startDate,
          endDate,
          storeIds,
          staffId,
        );
      default:
        throw new BadRequestException('Invalid report type provided');
    }
  }

  private async getProcessedSalesData(
    startDate: Date,
    endDate: Date,
    storeIds: string[],
    groupBy: AdvancedSalesReportType,
    staffId?: string,
  ) {
    let cashierId: number | undefined = undefined;

    const createDefaultSummary = () => ({
      jumlahTerjual: 0,
      kotor: 0,
      diskonItem: 0,
      refund: 0,
      pajak: 0,
      totalPenjualan: 0,
      countPenggunaanVoucher: 0,
    });

    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.employees.findUnique({
        where: { id: staffId },
        select: { user_id: true },
      });

      if (employee) {
        cashierId = employee.user_id;
      } else {
        // Jika staffId tidak valid, kembalikan hasil kosong agar tidak error
        return { overallSummary: createDefaultSummary(), groupedSummary: [] };
      }
    }

    const invoiceWhere: Prisma.invoiceWhereInput = {
      store_id: { in: storeIds },
      payment_status: 'paid',
      paid_at: { gte: startDate, lte: endDate },
    };
    if (cashierId !== undefined) {
      invoiceWhere.cashier_id = cashierId;
    }

    const invoiceDetails = await this.prisma.invoice_details.findMany({
      where: {
        invoice: invoiceWhere,
      },
      include: {
        products: {
          include: {
            categories_has_products: { include: { categories: true } },
          },
        },
        invoice: { include: { customer: true, stores: true, users: true } },
        variant: true,
      },
    });

    const overallSummary = createDefaultSummary();
    const processedInvoicesForSummary = new Set<string>();
    const salesDataMap = new Map<
      string,
      ReturnType<typeof createDefaultSummary>
    >();
    const processedInvoicesForGroupVoucher = new Map<string, Set<string>>();

    for (const item of invoiceDetails) {
      const { invoice, products: product, variant } = item;
      if (!invoice || !product) continue;

      const itemGross = (item.product_price ?? 0) * (item.qty ?? 1);
      const itemPortion =
        invoice.subtotal > 0 ? itemGross / invoice.subtotal : 0;
      const itemDiscount = (invoice.discount_amount ?? 0) * itemPortion;
      const itemTax = (invoice.tax_amount ?? 0) * itemPortion;
      const itemTotal = itemGross - itemDiscount + itemTax;

      let groupKey: string;
      switch (groupBy) {
        case 'category':
          const categoryNames = product.categories_has_products
            .map((chp) => chp.categories?.category)
            .filter(Boolean) as string[];
          groupKey =
            categoryNames.length > 0
              ? categoryNames.sort().join(', ')
              : 'Uncategorized';
          break;
        case 'variant':
          groupKey = variant?.name ?? 'No Variant';
          break;
        case 'item':
          groupKey = product.name ?? 'Unknown Item';
          break;
        case 'store':
          groupKey = invoice.stores?.name ?? 'Unknown Store';
          break;
        case 'customer':
          groupKey = invoice.customer?.name ?? 'Guest Customer';
          break;
        case 'staff':
          groupKey = invoice.users?.fullname ?? 'Unknown Staff';
          break;
        case 'day':
          groupKey = invoice.paid_at!.toISOString().split('T')[0];
          break;
        case 'month':
          groupKey = `${invoice.paid_at!.getFullYear()}-${String(invoice.paid_at!.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const month = invoice.paid_at!.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          groupKey = `${invoice.paid_at!.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          groupKey = String(invoice.paid_at!.getFullYear());
          break;
        default:
          groupKey = 'Overall';
      }

      if (!salesDataMap.has(groupKey)) {
        salesDataMap.set(groupKey, createDefaultSummary());
        processedInvoicesForGroupVoucher.set(groupKey, new Set());
      }
      const groupSummary = salesDataMap.get(groupKey)!;
      groupSummary.jumlahTerjual += item.qty ?? 1;
      groupSummary.kotor += itemGross;
      groupSummary.diskonItem += itemDiscount;
      groupSummary.pajak += itemTax;
      groupSummary.totalPenjualan += itemTotal;

      const groupVoucherSet = processedInvoicesForGroupVoucher.get(groupKey)!;
      if (invoice.voucher_id && !groupVoucherSet.has(invoice.id)) {
        groupSummary.countPenggunaanVoucher += 1;
        groupVoucherSet.add(invoice.id);
      }

      overallSummary.jumlahTerjual += item.qty ?? 1;
      overallSummary.kotor += itemGross;
      overallSummary.diskonItem += itemDiscount;
      overallSummary.pajak += itemTax;
      overallSummary.totalPenjualan += itemTotal;
      if (invoice.voucher_id && !processedInvoicesForSummary.has(invoice.id)) {
        overallSummary.countPenggunaanVoucher += 1;
        processedInvoicesForSummary.add(invoice.id);
      }
    }

    let masterGroups: string[] = [];

    switch (groupBy) {
      case 'item':
        const allProducts = await this.prisma.products.findMany({
          where: { stores_id: { in: storeIds } },
          select: { name: true },
        });
        masterGroups = allProducts.map((p) => p.name ?? 'Unknown Item');
        break;
      case 'category':
        const allProductCategories = await this.prisma.products.findMany({
          where: { stores_id: { in: storeIds } },
          include: {
            categories_has_products: { include: { categories: true } },
          },
        });
        const categoryCombinations = new Set<string>();
        allProductCategories.forEach((p) => {
          const names = p.categories_has_products
            .map((chp) => chp.categories.category)
            .filter(Boolean) as string[];
          const key =
            names.length > 0 ? names.sort().join(', ') : 'Uncategorized';
          categoryCombinations.add(key);
        });
        masterGroups = Array.from(categoryCombinations);
        break;
      case 'staff':
        const allStaff = await this.prisma.users.findMany({
          where: { employees: { stores_id: { in: storeIds } } },
          select: { fullname: true },
        });
        masterGroups = allStaff.map((s) => s.fullname ?? 'Unknown Staff');
        break;
      case 'customer':
        const allCustomers = await this.prisma.customer.findMany({
          where: { stores_id: { in: storeIds } },
          select: { name: true },
        });
        masterGroups = allCustomers.map((c) => c.name ?? 'Guest Customer');
        break;

      case 'day':
        const dayGroups = [];
        let currentDate = new Date(startDate.toISOString().split('T')[0]);
        while (currentDate <= endDate) {
          dayGroups.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        masterGroups = dayGroups;
        break;
      case 'month':
        const monthGroups = [];
        let currentMonth = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          1,
        );
        const finalMonth = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          1,
        );
        while (currentMonth <= finalMonth) {
          const year = currentMonth.getFullYear();
          const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
          monthGroups.push(`${year}-${month}`);
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        masterGroups = monthGroups;
        break;
      case 'year':
        const yearGroups = [];
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        for (let year = startYear; year <= endYear; year++) {
          yearGroups.push(String(year));
        }
        masterGroups = yearGroups;
        break;
      case 'quarter':
        const year = startDate.getFullYear();
        masterGroups = [`${year}-Q1`, `${year}-Q2`, `${year}-Q3`, `${year}-Q4`];
        break;

      default:
        masterGroups = Array.from(salesDataMap.keys());
        break;
    }

    const groupedSummary = masterGroups.sort().map((groupKey) => {
      const summary = salesDataMap.get(groupKey) || createDefaultSummary();
      return {
        group: groupKey,
        ...summary,
      };
    });

    return { overallSummary, groupedSummary };
  }

  async getAdvancedSalesReport(
    startDateString: Date,
    endDateString: Date,
    type: AdvancedSalesReportType,
    req: ICustomRequestHeaders,
    storeIdsString: string,
    staffId?: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    if (!storeIdsString) {
      throw new BadRequestException('store_ids is required.');
    }
    const storeIds = storeIdsString.split(',');

    // Ini adalah bagian kunci: Set waktu endDate ke akhir hari
    endDate.setHours(23, 59, 59, 999);
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    return this.getProcessedSalesData(
      startDate,
      endDate,
      storeIds,
      type,
      staffId,
    );
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

  private async getAttendanceSummary(req: ICustomRequestHeaders) {
    const storeId = req.store_id;

    const staffList = await this.prisma.employees.findMany({
      where: {
        stores_id: storeId,
        // Asumsi 'end_date' null berarti staf masih aktif
        end_date: null,
      },
      select: {
        name: true,
        email: true,
        title: true,
        start_date: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      totalStaff: staffList.length,
      staff: staffList,
    };
  }

  /**
   * Menghitung dan memberikan rincian komisi untuk semua staf dalam rentang tanggal.
   * @param startDate Tanggal mulai periode laporan.
   * @param endDate Tanggal akhir periode laporan.
   * @param req Request object yang berisi store_id.
   * @returns Objek yang berisi ringkasan total komisi dan rincian per staf.
   */
  private async getCommissionReport(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    // 1. Ambil semua transaksi yang dicatat oleh kasir dalam rentang waktu
    const invoices = await this.prisma.invoice.findMany({
      where: {
        store_id: storeId,
        payment_status: 'paid',
        paid_at: { gte: startDate, lte: endDate },
        // Pastikan ada kasir yang tercatat
        cashier_id: { not: null },
      },
      include: {
        // Ambil detail item untuk komisi produk
        invoice_details: {
          include: {
            products: true,
          },
        },
        // Ambil data user kasir -> employee
        users: {
          include: {
            employees: true,
          },
        },
        // Ambil data voucher untuk komisi voucher
        voucher: true,
      },
    });

    // 2. Ambil semua aturan komisi yang ada untuk efisiensi
    const productCommissionRules =
      await this.prisma.product_commissions.findMany();
    const voucherCommissionRules =
      await this.prisma.voucher_commissions.findMany();

    // Buat Map untuk pencarian aturan yang cepat
    const productRulesMap = new Map(
      productCommissionRules.map((r) => [
        `${r.employees_id}-${r.products_id}`,
        r,
      ]),
    );
    const voucherRulesMap = new Map(
      voucherCommissionRules.map((r) => [
        `${r.employees_id}-${r.voucher_id}`,
        r,
      ]),
    );

    // 3. Proses dan agregasi data komisi
    const staffCommissionDetails = new Map<
      string,
      {
        staffName: string;
        totalCommission: number;
        totalVoucherCommission: number;
        totalProductCommission: number;
        details: {
          sourceName: string; // Nama produk atau voucher
          sourceType: 'Produk' | 'Voucher';
          commissionEarned: number;
        }[];
      }
    >();

    for (const invoice of invoices) {
      const employee = invoice.users?.employees;
      if (!employee) continue;

      // Inisialisasi data staf jika belum ada
      if (!staffCommissionDetails.has(employee.id)) {
        staffCommissionDetails.set(employee.id, {
          staffName: employee.name ?? 'Unknown Staff',
          totalCommission: 0,
          totalVoucherCommission: 0,
          totalProductCommission: 0,
          details: [],
        });
      }

      const staffData = staffCommissionDetails.get(employee.id)!;

      // Hitung komisi produk dari setiap item di invoice
      for (const detail of invoice.invoice_details) {
        const rule = productRulesMap.get(`${employee.id}-${detail.product_id}`);
        if (rule) {
          let commission = 0;
          const itemValue = (detail.product_price ?? 0) * (detail.qty ?? 1);

          if (rule.is_percent) {
            commission = itemValue * (rule.amount ?? 0);
          } else {
            // Komisi flat per item terjual
            commission = (rule.amount ?? 0) * (detail.qty ?? 1);
          }

          staffData.totalProductCommission += commission;
          staffData.details.push({
            sourceName: detail.products?.name ?? 'Unknown Product',
            sourceType: 'Produk',
            commissionEarned: commission,
          });
        }
      }

      // Hitung komisi voucher jika ada di invoice
      if (invoice.voucher_id) {
        const rule = voucherRulesMap.get(
          `${employee.id}-${invoice.voucher_id}`,
        );
        if (rule) {
          let commission = 0;
          // Asumsi komisi voucher adalah nilai flat, karena tidak ada nilai dasar untuk persentase
          commission = rule.amount ?? 0;

          staffData.totalVoucherCommission += commission;
          staffData.details.push({
            sourceName: invoice.voucher?.name ?? 'Unknown Voucher',
            sourceType: 'Voucher',
            commissionEarned: commission,
          });
        }
      }
    }

    // 4. Hitung total akhir dan siapkan output
    let totalProductCommission = 0;
    let totalVoucherCommission = 0;
    const staffDetailsList = [];

    for (const [staffId, data] of staffCommissionDetails.entries()) {
      data.totalCommission =
        data.totalProductCommission + data.totalVoucherCommission;
      totalProductCommission += data.totalProductCommission;
      totalVoucherCommission += data.totalVoucherCommission;
      staffDetailsList.push({ id: staffId, ...data });
    }

    const summary = {
      totalNilaiKomisi: totalProductCommission + totalVoucherCommission,
      totalKomisiVoucher: totalVoucherCommission,
      totalKomisiProduk: totalProductCommission,
    };

    return { summary, details: staffDetailsList };
  }

  /**
   * Fungsi publik utama untuk laporan terkait staf.
   */
  async getStaffReports(
    startDateString: Date,
    endDateString: Date,
    type: StaffReportType,
    req: ICustomRequestHeaders,
  ) {
    if (type === 'attendance-summary') {
      return this.getAttendanceSummary(req);
    }

    // Hanya butuh tanggal untuk laporan komisi
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    const commissionData = await this.getCommissionReport(
      startDate,
      endDate,
      req,
    );

    if (type === 'commission-summary') {
      return commissionData.summary;
    }

    if (type === 'commission-details') {
      return commissionData.details;
    }

    throw new BadRequestException(
      'Invalid report type provided for staff reports',
    );
  }

  async getCustomerReport(req: ICustomRequestHeaders) {
    const storeId = req.store_id;

    // 1. Ambil semua data master pelanggan dari toko ini.
    const customersPromise = this.prisma.customer.findMany({
      where: {
        stores_id: storeId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 2. Agregasi total penjualan (invoice yang sudah 'paid') per pelanggan.
    const salesDataPromise = this.prisma.invoice.groupBy({
      by: ['customer_id'],
      where: {
        store_id: storeId,
        payment_status: 'paid', // Hanya hitung yang sudah lunas
        customer_id: { not: null },
      },
      _sum: {
        grand_total: true,
      },
    });

    // 3. Agregasi total tagihan terutang (invoice yang 'unpaid') per pelanggan.
    const outstandingDataPromise = this.prisma.invoice.groupBy({
      by: ['customer_id'],
      where: {
        store_id: storeId,
        payment_status: 'unpaid', // Hanya hitung yang belum lunas
        customer_id: { not: null },
      },
      _sum: {
        grand_total: true,
      },
    });

    // Jalankan semua kueri secara bersamaan untuk efisiensi
    const [customers, salesData, outstandingData] = await Promise.all([
      customersPromise,
      salesDataPromise,
      outstandingDataPromise,
    ]);

    // 4. Ubah hasil agregasi menjadi Map untuk pencarian cepat (lookup)
    const salesMap = new Map(
      salesData.map((item) => [item.customer_id, item._sum.grand_total || 0]),
    );
    const outstandingMap = new Map(
      outstandingData.map((item) => [
        item.customer_id,
        item._sum.grand_total || 0,
      ]),
    );

    // 5. Gabungkan semua data menjadi satu laporan yang utuh
    const report = customers.map((customer) => {
      // Ambil data dari map, jika tidak ada berarti nilainya 0
      const totalSales = salesMap.get(customer.id) || 0;
      const outstanding = outstandingMap.get(customer.id) || 0;

      return {
        nama: customer.name,
        gender: customer.gender,
        totalSales: parseFloat(totalSales.toFixed(2)),
        dateAdded: customer.created_at,
        outstanding: parseFloat(outstanding.toFixed(2)),
        loyaltyPoints: customer.point || 0,
      };
    });

    return report;
  }
}
