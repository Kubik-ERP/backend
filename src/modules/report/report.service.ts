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

export type InventoryReportType =
  | 'movement-ledger'
  | 'current-stock-overview'
  | 'po-receiving-variance'
  | 'slow-dead-stock'
  | 'item-performance'
  | 'item-performance-by-category'
  | 'item-performance-by-brand';

export type LoyaltyReportType =
  | 'spend-based'
  | 'product-based'
  | 'benefit-utilization'
  | 'expiry-warning'
  | 'type-accumulation';

export interface IBenefitDashboard {
  sumOfAllPoints: number;
  countCustomers: number;
  sumPointsUsedByType: Record<string, number>;
  sumOfDiscountAmount: number;
  sumOfCountTotalFreeItems: number;
}

export interface IExpiryDashboard {
  sumOfAllPoints: number;
  countCustomers: number;
  sumByEachTypes: Record<string, number>;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  private roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  private formatSummaryObject(summary: {
    jumlahTerjual: number;
    kotor: number;
    diskonItem: number;
    refund: number;
    pajak: number;
    biayaLayanan: number;
    totalPenjualan: number;
    countPenggunaanVoucher: number;
  }) {
    return {
      // Integer (tidak perlu dibulatkan)
      jumlahTerjual: summary.jumlahTerjual,
      countPenggunaanVoucher: summary.countPenggunaanVoucher,

      // Mata Uang (dibulatkan 2 desimal)
      kotor: this.roundToTwo(summary.kotor),
      diskonItem: this.roundToTwo(summary.diskonItem),
      refund: this.roundToTwo(summary.refund),
      pajak: this.roundToTwo(summary.pajak),
      biayaLayanan: this.roundToTwo(summary.biayaLayanan),
      totalPenjualan: this.roundToTwo(summary.totalPenjualan),
    };
  }

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
      cashierId = +staffId;
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
      cashierId = +staffId;
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
        total_product_discount: true,
        tax_amount: true,
        grand_total: true,
        rounding_amount: true,
        service_charge_amount: true,
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
        total_product_discount: true,
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
    const discount = invoiceAggregation._sum.total_product_discount || 0;
    const netSales = grossSales - discount;
    const tax = invoiceAggregation._sum.tax_amount || 0;
    const nettTotal = invoiceAggregation._sum.grand_total || 0;
    const rounding = invoiceAggregation._sum.rounding_amount || 0;
    const serviceCharge = invoiceAggregation._sum.service_charge_amount || 0;

    return {
      sales: {
        penjualanKotor: grossSales,
        diskon: discount,
        refund: 0,
        penjualanBersih: netSales,
        pajak: tax,
        biayaLayanan: serviceCharge,
        pembulatan: rounding,
        penggunaanVoucher:
          voucherUsageAggregation._sum.total_product_discount || 0,
        nettTotal: nettTotal,
      },
      // paymentType: {
      //   total: nettTotal,
      //   refund: 0,
      //   outstanding: outstandingAggregation._sum.grand_total || 0,
      // },
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
      cashierId = +staffId;
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
      cashierId = +staffId;
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
    req: ICustomRequestHeaders,
    storeIdsString?: String,
    staffId?: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    let storeIds: string[] = [];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

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
      biayaLayanan: 0,
      totalPenjualan: 0,
      countPenggunaanVoucher: 0,
    });

    if (staffId && staffId !== 'all') {
      const employee = await this.prisma.users.findFirst({
        where: { id: +staffId },
        select: { id: true },
      });

      if (employee) {
        cashierId = employee.id;
      } else {
        return {
          overallSummary: this.formatSummaryObject(createDefaultSummary()),
          groupedSummary: [],
        };
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
      const serviceCharge = (invoice.service_charge_amount ?? 0) * itemPortion;
      const itemTotal = itemGross - itemDiscount + itemTax + serviceCharge;

      // =================================================================
      // FIX #1: Grouping is now done by ID instead of by name.
      // =================================================================
      let groupKey: string;
      switch (groupBy) {
        case 'category':
          const categoryIds = product.categories_has_products
            .map((chp) => chp.categories?.id)
            .filter(Boolean) as string[];
          groupKey =
            categoryIds.length > 0
              ? categoryIds.sort().join(',')
              : 'uncategorized';
          break;
        case 'variant':
          groupKey = variant?.id ?? 'no-variant';
          break;
        case 'item':
          groupKey = product.id;
          break;
        case 'store':
          groupKey = invoice.stores?.id ?? 'unknown-store';
          break;
        case 'customer':
          groupKey = invoice.customer?.id ?? 'guest-customer';
          break;
        case 'staff':
          groupKey = invoice.users?.id.toString() ?? 'unknown-staff';
          break;
        case 'day':
          groupKey = invoice.paid_at!.toISOString().split('T')[0];
          break;
        case 'month':
          groupKey = `${invoice.paid_at!.getFullYear()}-${String(
            invoice.paid_at!.getMonth() + 1,
          ).padStart(2, '0')}`;
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
      groupSummary.biayaLayanan += serviceCharge;
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
      overallSummary.biayaLayanan += serviceCharge;
      overallSummary.totalPenjualan += itemTotal;
      if (invoice.voucher_id && !processedInvoicesForSummary.has(invoice.id)) {
        overallSummary.countPenggunaanVoucher += 1;
        processedInvoicesForSummary.add(invoice.id);
      }
    }

    // =================================================================
    // FIX #2: Fetch all possible groups with their IDs and names
    // to build a complete list and a map for labeling.
    // =================================================================
    let masterGroupIds: string[] = [];
    const idToNameMap = new Map<string, string>();

    switch (groupBy) {
      case 'item':
        const allProducts = await this.prisma.products.findMany({
          where: { stores_id: { in: storeIds } },
          select: { id: true, name: true },
        });
        allProducts.forEach((p) =>
          idToNameMap.set(p.id, p.name ?? 'Unknown Item'),
        );
        masterGroupIds = allProducts.map((p) => p.id);
        break;
      case 'category':
        const allCategories = await this.prisma.categories.findMany({
          where: { stores_id: { in: storeIds } },
          select: { id: true, category: true },
        });
        allCategories.forEach((c) =>
          idToNameMap.set(c.id, c.category ?? 'Unknown Category'),
        );
        masterGroupIds = allCategories.map((c) => c.id);
        // Add a key for uncategorized items if they exist in the sales data
        if (salesDataMap.has('uncategorized')) {
          masterGroupIds.push('uncategorized');
          idToNameMap.set('uncategorized', 'Uncategorized');
        }
        break;
      case 'staff':
        const allStaff = await this.prisma.users.findMany({
          where: { employees: { stores_id: { in: storeIds } } },
          select: { id: true, fullname: true },
        });
        //add owner also
        const owner = await this.prisma.users.findFirst({
          where: {
            user_has_stores: {
              some: { store_id: { in: storeIds } },
            },
          },
          select: { id: true, fullname: true },
        });
        if (owner) {
          allStaff.push(owner);
        }
        allStaff.forEach((s) =>
          idToNameMap.set(s.id.toString(), s.fullname ?? 'Unknown Staff'),
        );
        masterGroupIds = allStaff.map((s) => s.id.toString());
        break;
      case 'customer':
        const allCustomers = await this.prisma.customer.findMany({
          where: { stores_id: { in: storeIds } },
          select: { id: true, name: true },
        });
        allCustomers.forEach((c) =>
          idToNameMap.set(c.id, c.name ?? 'Guest Customer'),
        );
        masterGroupIds = allCustomers.map((c) => c.id);
        // Add a key for guest customers if they exist in the sales data
        if (salesDataMap.has('guest-customer')) {
          masterGroupIds.push('guest-customer');
          idToNameMap.set('guest-customer', 'Guest Customer');
        }
        break;
      // ... other cases like 'variant', 'store' would follow the same pattern ...
      // Cases for time-based grouping remain the same as their key is their label
      case 'day':
        let currentDate = new Date(startDate.toISOString().split('T')[0]);
        while (currentDate <= endDate) {
          masterGroupIds.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;
      // ... other time-based cases ...
      default:
        masterGroupIds = Array.from(salesDataMap.keys());
        break;
    }

    // =================================================================
    // FIX #3: Map the final summary using the ID key, but display the name.
    // =================================================================
    const groupedSummary = masterGroupIds
      .map((groupKey) => {
        const summary = salesDataMap.get(groupKey) || createDefaultSummary();
        const groupName = idToNameMap.get(groupKey) ?? groupKey;

        return {
          group: groupName,
          // Terapkan format ke summary per grup
          ...this.formatSummaryObject(summary),
        };
      })
      .sort((a, b) => a.group.localeCompare(b.group));
    const formattedOverallSummary = this.formatSummaryObject(overallSummary);

    return { overallSummary: formattedOverallSummary, groupedSummary };
  }

  async getAdvancedSalesReport(
    startDateString: Date,
    endDateString: Date,
    type: AdvancedSalesReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
    staffId?: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    let storeIds: string[] = [];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

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

  private async getMovementLedger(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const movements = await this.prisma.inventory_stock_adjustments.findMany({
      where: {
        stores_id: { in: storeId },
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        created_at: true,
        master_inventory_items: { select: { name: true } },
        action: true,
        adjustment_quantity: true,
        new_quantity: true,
        notes: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return movements.map((m) => ({
      tanggal: m.created_at,
      itemName: m.master_inventory_items.name,
      adjustmentType: m.action,
      // Jika STOCK_OUT, kuantitasnya negatif
      adjustmentQuantity:
        m.action === 'STOCK_OUT'
          ? -m.adjustment_quantity
          : m.adjustment_quantity,
      newStockQuantity: m.new_quantity,
      notes: m.notes,
    }));
  }

  /**
   * Laporan 2: Current Stock Overview (Widget)
   */
  private async getCurrentStockOverview(storeIds: string[]) {
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: { store_id: { in: storeIds } },
      include: { products: { select: { price: true } } },
    });

    const summary = inventoryItems.reduce(
      (acc, item) => {
        const stockQuantity = item.stock_quantity || 0;
        const costPrice = Number(item.price_per_unit) || 0;
        const retailPrice = item.products?.price || 0;

        acc.totalOnHand += stockQuantity;
        acc.totalStockCost += stockQuantity * costPrice;
        if (retailPrice > 0) {
          acc.totalRetailValue += stockQuantity * retailPrice;
        }
        return acc;
      },
      { totalOnHand: 0, totalStockCost: 0, totalRetailValue: 0 },
    );

    const averageStockCost =
      summary.totalOnHand > 0
        ? summary.totalStockCost / summary.totalOnHand
        : 0;

    return {
      totalOnHand: summary.totalOnHand,
      totalStockCost: parseFloat(summary.totalStockCost.toFixed(2)),
      averageStockCost: parseFloat(averageStockCost.toFixed(2)),
      totalRetailPrice: parseFloat(summary.totalRetailValue.toFixed(2)),
    };
  }

  private async getPoReceivingVariance(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const poItems = await this.prisma.purchase_order_items.findMany({
      where: {
        purchase_orders: {
          store_id: { in: storeId },
          order_date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        purchase_orders: { select: { order_number: true } },
        master_inventory_items: { select: { name: true } },
        quantity: true,
        actual_quantity: true,
        unit_price: true,
      },
    });

    return poItems.map((item) => {
      const qtyPO = item.quantity;
      const qtyAktual = item.actual_quantity || 0;
      const qtySelisih = qtyPO - qtyAktual;
      const itemPrice = Number(item.unit_price) || 0;
      const varPrice = qtySelisih * itemPrice;

      return {
        poId: item.purchase_orders.order_number,
        item: item.master_inventory_items.name,
        qtyPO,
        qtyAktual,
        qtySelisih,
        itemPrice,
        var_price: parseFloat(varPrice.toFixed(2)),
      };
    });
  }

  /**
   * Laporan 4: Slow/Dead Stock
   */
  private async getSlowDeadStock(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    // 1. Dapatkan daftar ID item unik yang MEMILIKI pergerakan dalam rentang waktu.
    // Ini adalah item yang "aktif" atau "tidak lambat".
    const movedRecently =
      await this.prisma.inventory_stock_adjustments.findMany({
        where: {
          stores_id: { in: storeId },
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          master_inventory_items_id: true,
        },
        distinct: ['master_inventory_items_id'], // Ambil ID item yang unik
      });

    // Ubah menjadi Set untuk pencarian yang sangat cepat (O(1))
    const movedItemIds = new Set(
      movedRecently.map((m) => m.master_inventory_items_id),
    );

    // 2. Dapatkan SEMUA item yang saat ini ada stoknya.
    const allItemsInStore = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: { in: storeId },
        stock_quantity: { gt: 0 },
        // Tambahkan filter untuk MENGECUALIKAN item yang baru saja bergerak
        id: {
          notIn: Array.from(movedItemIds),
        },
      },
    });

    // 3. Dapatkan tanggal pergerakan terakhir aktual untuk item yang lambat
    //    untuk menghitung 'daysIdle' secara akurat.
    const lastMovements = await this.prisma.inventory_stock_adjustments.groupBy(
      {
        by: ['master_inventory_items_id'],
        where: {
          stores_id: { in: storeId },
          // Hanya perlu mencari untuk item yang relevan (slow stock)
          master_inventory_items_id: { in: allItemsInStore.map((i) => i.id) },
        },
        _max: { created_at: true },
      },
    );

    const lastMovementMap = new Map<string, Date>();
    lastMovements.forEach((m) => {
      lastMovementMap.set(m.master_inventory_items_id, m._max.created_at!);
    });

    const slowStock = [];
    const today = new Date();

    // 4. Loop hanya melalui item yang sudah dipastikan "slow stock"
    for (const item of allItemsInStore) {
      // Kita sudah tahu item ini lambat, sekarang tinggal hitung datanya.
      const lastStockUpdated = lastMovementMap.get(item.id) || item.created_at;
      const diffTime = Math.abs(today.getTime() - lastStockUpdated.getTime());
      const daysIdle = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      slowStock.push({
        item: item.name,
        onHand: item.stock_quantity,
        lastStockUpdated: lastStockUpdated.toDateString(),
        daysIdle,
      });
    }

    return slowStock;
  }

  /**
   * Helper untuk Laporan Performance (5, 6, 7)
   */
  private async getMovementAggregates(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const whereClause = {
      stores_id: { in: storeId },
      created_at: { gte: startDate, lte: endDate },
    };

    const totalMovements =
      await this.prisma.inventory_stock_adjustments.groupBy({
        by: ['master_inventory_items_id'],
        where: whereClause,
        _count: { _all: true },
      });

    const totalQtyOut = await this.prisma.inventory_stock_adjustments.groupBy({
      by: ['master_inventory_items_id'],
      where: { ...whereClause, action: 'STOCK_OUT' },
      _sum: { adjustment_quantity: true },
    });

    const movementMap = new Map<string, { count: number; qtyOut: number }>();
    totalMovements.forEach((m) => {
      movementMap.set(m.master_inventory_items_id, {
        count: m._count._all,
        qtyOut: 0,
      });
    });
    totalQtyOut.forEach((m) => {
      const existing = movementMap.get(m.master_inventory_items_id);
      if (existing) {
        existing.qtyOut = m._sum.adjustment_quantity || 0;
      }
    });
    return movementMap;
  }

  /**
   * Laporan 5: Item Performance
   */
  private async getItemPerformance(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    const items = await this.prisma.master_inventory_items.findMany({
      where: { store_id: { in: storeId } },
    });
    const movementAggregates = await this.getMovementAggregates(
      storeId,
      startDate,
      endDate,
    );

    return items.map((item) => {
      const aggregates = movementAggregates.get(item.id) || {
        count: 0,
        qtyOut: 0,
      };
      const stockValue =
        (item.stock_quantity || 0) * Number(item.price_per_unit || 0);

      return {
        itemName: item.name,
        stockQty: item.stock_quantity,
        totalStockValue: parseFloat(stockValue.toFixed(2)),
        totalMovementsCount: aggregates.count,
        totalQtyOut: aggregates.qtyOut,
      };
    });
  }

  /**
   * Laporan 6 & 7: Category & Brand Performance
   */
  /**
   * Laporan 6: Category Performance (Fungsi Terpisah)
   */
  private async getCategoryPerformance(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    // Query dioptimalkan untuk hanya mengambil item yang punya kategori
    const items = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: { in: storeId },
      },
      include: {
        master_inventory_categories: true,
      },
    });

    const movementAggregates = await this.getMovementAggregates(
      storeId,
      startDate,
      endDate,
    );

    const performanceMap = new Map<
      string,
      {
        name: string;
        itemCount: number;
        totalStockValue: number;
        totalMovementsCount: number;
        totalQtyOut: number;
      }
    >();

    for (const item of items) {
      const category = item.master_inventory_categories;

      const aggregates = movementAggregates.get(item.id) || {
        count: 0,
        qtyOut: 0,
      };
      const stockValue =
        (item.stock_quantity || 0) * Number(item.price_per_unit || 0);

      let current = performanceMap.get(category.id);
      if (!current) {
        current = {
          name: category.name,
          itemCount: 0,
          totalStockValue: 0,
          totalMovementsCount: 0,
          totalQtyOut: 0,
        };
      }

      current.itemCount += 1;
      current.totalStockValue += stockValue;
      current.totalMovementsCount += aggregates.count;
      current.totalQtyOut += aggregates.qtyOut;

      performanceMap.set(category.id, current);
    }

    return Array.from(performanceMap.values()).map((data) => ({
      category: data.name, // Properti 'category' statis
      itemCount: data.itemCount,
      totalStockValue: parseFloat(data.totalStockValue.toFixed(2)),
      totalMovementsCount: data.totalMovementsCount,
      totalQtyOut: data.totalQtyOut,
    }));
  }

  private async getBrandPerformance(
    storeId: string[],
    startDate: Date,
    endDate: Date,
  ) {
    // Query dioptimalkan untuk hanya mengambil item yang punya brand
    const items = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: { in: storeId },
        brand_id: { not: null }, // <-- PENTING: Mengecualikan item tanpa brand
      },
      include: {
        master_brands: true, // Hanya include yang relevan
      },
    });

    const movementAggregates = await this.getMovementAggregates(
      storeId,
      startDate,
      endDate,
    );

    const performanceMap = new Map<
      string,
      {
        name: string;
        itemCount: number;
        totalStockValue: number;
        totalMovementsCount: number;
        totalQtyOut: number;
      }
    >();

    for (const item of items) {
      // Tidak perlu cek, karena query sudah memastikan brand ada
      const brand = item.master_brands;

      const aggregates = movementAggregates.get(item.id) || {
        count: 0,
        qtyOut: 0,
      };
      const stockValue =
        (item.stock_quantity || 0) * Number(item.price_per_unit || 0);

      let current = performanceMap.get(brand!.id);
      if (!current) {
        current = {
          name: brand!.brand_name,
          itemCount: 0,
          totalStockValue: 0,
          totalMovementsCount: 0,
          totalQtyOut: 0,
        };
      }

      current.itemCount += 1;
      current.totalStockValue += stockValue;
      current.totalMovementsCount += aggregates.count;
      current.totalQtyOut += aggregates.qtyOut;

      performanceMap.set(brand!.id, current);
    }

    return Array.from(performanceMap.values()).map((data) => ({
      brand: data.name, // Properti 'brand' statis
      itemCount: data.itemCount,
      totalStockValue: parseFloat(data.totalStockValue.toFixed(2)),
      totalMovementsCount: data.totalMovementsCount,
      totalQtyOut: data.totalQtyOut,
    }));
  }

  async getInventoryValuation(
    startDateString: Date,
    endDateString: Date,
    type: InventoryReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    let storeIds: string[] = [];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

    // Ini adalah bagian kunci: Set waktu endDate ke akhir hari
    endDate.setHours(23, 59, 59, 999);
    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    switch (type) {
      case 'movement-ledger':
        return this.getMovementLedger(storeIds, startDate, endDate);
      case 'current-stock-overview':
        return this.getCurrentStockOverview(storeIds);
      case 'po-receiving-variance':
        return this.getPoReceivingVariance(storeIds, startDate, endDate);
      case 'slow-dead-stock':
        return this.getSlowDeadStock(storeIds, startDate, endDate);
      case 'item-performance':
        return this.getItemPerformance(storeIds, startDate, endDate);
      case 'item-performance-by-category':
        return this.getCategoryPerformance(storeIds, startDate, endDate);
      case 'item-performance-by-brand':
        return this.getBrandPerformance(storeIds, startDate, endDate);
      default:
        throw new BadRequestException('Invalid report type provided');
    }
  }

  async getVoucherStatusReport(req: ICustomRequestHeaders, storeIds?: string) {
    let storeId: string[] = [];
    if (storeIds) {
      storeId = storeIds.split(',');
    } else if (req.store_id) {
      storeId = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

    // 1. Ambil semua voucher untuk toko, dan hitung total invoice yang terhubung
    const vouchersWithUsage = await this.prisma.voucher.findMany({
      where: {
        store_id: { in: storeId },
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
      let status: 'Upcoming' | 'Expired' | 'Active';
      const startDate = new Date(voucher.start_period);
      const endDate = new Date(voucher.end_period);
      // Set jam akhir ke ujung hari untuk perbandingan yang akurat
      endDate.setHours(23, 59, 59, 999);

      if (now < startDate) {
        status = 'Upcoming';
      } else if (now > endDate) {
        status = 'Expired';
      } else {
        status = 'Active';
      }

      // Format tanggal untuk keterbacaan
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-EN', {
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

  private async getAttendanceSummary(storeIds?: string[]) {
    const staffList = await this.prisma.employees.findMany({
      where: {
        stores_id: { in: storeIds },
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
    storeIds: string[],
  ) {
    // 1. Ambil semua transaksi yang dicatat oleh kasir dalam rentang waktu
    const invoices = await this.prisma.invoice.findMany({
      where: {
        store_id: { in: storeIds },
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
    storeIds?: string,
  ) {
    let storeId: string[] = [];
    if (storeIds) {
      storeId = storeIds.split(',');
    } else if (req.store_id) {
      storeId = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }
    if (type === 'attendance-summary') {
      return this.getAttendanceSummary(storeId);
    }
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    // Panggil fungsi private
    const commissionData = await this.getCommissionReport(
      startDate,
      endDate,
      storeId,
    );
    if (type === 'commission-summary' || type === 'commission-details') {
      return commissionData;
    }

    throw new BadRequestException(
      'Invalid report type provided for staff reports',
    );
  }

  async getLoyaltyReport(
    type: LoyaltyReportType,
    req: ICustomRequestHeaders,
    storeIdsString?: string,
  ) {
    let storeIds: string[] = [];
    if (storeIdsString) {
      storeIds = storeIdsString.split(',');
    } else if (req.store_id) {
      storeIds = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

    switch (type) {
      case 'spend-based':
        return this.getSpendBasedReport(storeIds);
      case 'product-based':
        return this.getProductBasedReport(storeIds);
      case 'benefit-utilization':
        return this.getBenefitUtilizationReport(storeIds);
      case 'expiry-warning':
        return this.getExpiryWarningReport(storeIds);
      case 'type-accumulation':
        return this.getTypeAccumulationReport(storeIds);
      default:
        throw new BadRequestException('Invalid loyalty report type');
    }
  }

  private async getLoyaltyDashboardBase(storeIds: string[]) {
    const totalPointsAgg = await this.prisma.customer.aggregate({
      where: { stores_id: { in: storeIds } },
      _sum: { point: true },
    });
    const totalCustomers = await this.prisma.customer.count({
      where: { stores_id: { in: storeIds } },
    });

    // PERUBAHAN: Menggunakan status: 'expired' (asumsi)
    const pointsExpiredAgg = await this.prisma.trn_customer_points.aggregate({
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        status: 'expired',
      },
      _sum: { value: true },
    });

    return {
      sumOfAllPoints: totalPointsAgg._sum.point || 0,
      sumOfAllPointsExpired: pointsExpiredAgg._sum.value || 0,
      totalCustomers: totalCustomers,
    };
  }

  private async getSpendBasedReport(storeIds: string[]) {
    const baseMetrics = await this.getLoyaltyDashboardBase(storeIds);
    const totalInvoices = await this.prisma.invoice.count({
      where: {
        store_id: { in: storeIds },
        payment_status: 'paid',
        customer_id: { not: null },
      },
    });

    // Asumsi: 'Spend Based' diidentifikasi dengan `invoice_id` yang terisi
    // dan `notes` yang spesifik (atau null). Kita asumsikan `invoice_id` not null.
    const pointTransactions = await this.prisma.trn_customer_points.findMany({
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        earn_type: 'spend_based',
        invoice_id: { not: null },
      },
      include: {
        invoice: true,
        customer: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const table = pointTransactions.map((tx) => ({
      invoiceId: tx.invoice?.invoice_number,
      purchaseDate: tx.invoice?.paid_at,
      customer: tx.customer.name,
      grandTotal: tx.invoice?.grand_total,
      orderType: tx.invoice?.order_type,
      totalPointsEarned: tx.value,
      pointExpiryDate: tx.expiry_date,
    }));

    return {
      dashboard: {
        ...baseMetrics,
        totalInvoices: totalInvoices,
      },
      table: table,
    };
  }

  private async getProductBasedReport(storeIds: string[]) {
    const baseMetrics = await this.getLoyaltyDashboardBase(storeIds);
    const totalProducts = await this.prisma.loyalty_product_item.count({
      where: {
        loyalty_point_settings: { storesId: { in: storeIds } },
      },
    });

    // Ambil daftar produk yang memberi poin
    const productRules = await this.prisma.loyalty_product_item.findMany({
      where: {
        loyalty_point_settings: { storesId: { in: storeIds } },
      },
      include: {
        products: true,
      },
    });

    const pointAggregates = await this.prisma.trn_customer_points.groupBy({
      by: ['product_id'],
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        earn_type: 'product_based',
        product_id: { not: null },
      },
      _sum: {
        value: true,
      },
    });
    const pointsGivenMap = new Map(
      pointAggregates.map((agg) => [agg.product_id, agg._sum.value || 0]),
    );

    const distinctCustomers = await this.prisma.trn_customer_points.findMany({
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        earn_type: 'product_based',
        product_id: { not: null },
      },
      distinct: ['product_id', 'customer_id'],
      select: { product_id: true, customer_id: true },
    });

    const customerCountMap = new Map<string, number>();
    for (const tx of distinctCustomers) {
      if (tx.product_id) {
        customerCountMap.set(
          tx.product_id,
          (customerCountMap.get(tx.product_id) || 0) + 1,
        );
      }
    }

    const table = productRules.map((rule) => {
      const price = rule.products.price || 0;
      const points = rule.points || 0;
      const productId = rule.products.id;

      return {
        productName: rule.products.name,
        productPrice: price,
        pointsToIDR: price > 0 ? points / price : 0,
        sumOfPointsGivenToCust: pointsGivenMap.get(productId) || 0,
        totalCust: customerCountMap.get(productId) || 0,
      };
    });

    return {
      dashboard: {
        ...baseMetrics,
        totalProductsForEarningBenefit: totalProducts,
      },
      table: table,
    };
  }

  private async getBenefitUtilizationReport(storeIds: string[]) {
    // Total poin (aktif)
    const { sumOfAllPoints } = await this.getLoyaltyDashboardBase(storeIds);

    // Ambil semua transaksi penukaran poin dalam periode
    const deductions = await this.prisma.trn_customer_points.findMany({
      where: {
        customer: { stores_id: { in: storeIds } },
        invoice_id: { not: null },
        type: 'point_deduction',
      },
      include: {
        invoice: {
          include: {
            loyalty_points_benefit: true,
          },
        },
      },
    });

    const benefits = await this.prisma.loyalty_points_benefit.findMany({
      where: {
        loyalty_point_settings: { storesId: { in: storeIds } },
      },
      include: {
        benefit_free_items: true,
      },
    });
    const benefitMap = new Map(benefits.map((b) => [b.benefit_name, b]));

    const dashboard: IBenefitDashboard = {
      sumOfAllPoints: sumOfAllPoints,
      countCustomers: new Set(deductions.map((d) => d.customer_id)).size,
      sumPointsUsedByType: {},
      sumOfDiscountAmount: 0,
      sumOfCountTotalFreeItems: 0,
    };

    const tableMap = new Map<
      string,
      {
        type: string;
        benefitName: string;
        countUsed: number;
        totalPointUsed: number;
        amount: number;
      }
    >();

    for (const tx of deductions) {
      const benefitName =
        tx.invoice?.loyalty_points_benefit?.benefit_name || 'Unknown Benefit';
      const benefitRule = benefitMap.get(benefitName);

      const type = benefitRule?.type || 'unknown';
      const pointsUsed = Math.abs(tx.value);
      let amount = 0;

      if (benefitRule?.type === 'discount') {
        amount = tx.invoice?.loyalty_discount || 0;
        dashboard.sumOfDiscountAmount += amount;
      } else if (benefitRule?.type === 'free_items') {
        benefitRule.benefit_free_items.forEach((item) => {
          amount += item.quantity || 0;
        });
        dashboard.sumOfCountTotalFreeItems += amount;
      }

      dashboard.sumPointsUsedByType[type] =
        (dashboard.sumPointsUsedByType[type] || 0) + pointsUsed;

      // Update tabel
      if (!tableMap.has(benefitName)) {
        tableMap.set(benefitName, {
          benefitName: benefitName,
          type: type,
          countUsed: 0,
          totalPointUsed: 0,
          amount: 0,
        });
      }
      const tableEntry = tableMap.get(benefitName)!;
      tableEntry.countUsed += 1;
      tableEntry.totalPointUsed += pointsUsed;
      tableEntry.amount += amount;
    }

    return {
      dashboard,
      table: Array.from(tableMap.values()),
    };
  }

  private async getExpiryWarningReport(storeIds: string[]) {
    const now = new Date();
    const nowMs = now.getTime();
    const allActivePoints = await this.prisma.trn_customer_points.findMany({
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        status: 'active', // Asumsi Anda punya status 'active'
        expiry_date: { gte: now }, // Hanya poin yang belum kedaluwarsa
      },
      include: {
        customer: true,
        invoice: true,
      },
      orderBy: {
        expiry_date: 'asc',
      },
    });

    const expiringSoonTxs = allActivePoints.filter((tx) => {
      if (!tx.created_at || !tx.expiry_date) {
        return false;
      }

      const createdMs = tx.created_at.getTime();
      const expiryMs = tx.expiry_date.getTime();

      const totalLifespanMs = expiryMs - createdMs;

      if (totalLifespanMs <= 0) {
        return false;
      }

      const halfwayMarkMs = createdMs + totalLifespanMs / 2;

      return nowMs >= halfwayMarkMs;
    });

    const dashboard: IExpiryDashboard = {
      sumOfAllPoints: 0,
      countCustomers: new Set(expiringSoonTxs.map((tx) => tx.customer_id)).size,
      sumByEachTypes: {},
    };

    const table = expiringSoonTxs.map((tx) => {
      const points = tx.value;
      const type = tx.earn_type || 'N/A';
      dashboard.sumOfAllPoints += points;
      dashboard.sumByEachTypes[type] =
        (dashboard.sumByEachTypes[type] || 0) + points;

      return {
        custName: tx.customer.name,
        invoice: tx.invoice?.invoice_number || 'N/A',
        type: type,
        points: points,
        expiryDate: tx.expiry_date,
      };
    });

    return { dashboard, table };
  }

  private async getTypeAccumulationReport(storeIds: string[]) {
    const baseMetrics = await this.getLoyaltyDashboardBase(storeIds);

    // ASUMSI: Tipe poin disimpan di `notes`
    const pointsByType = await this.prisma.trn_customer_points.groupBy({
      by: ['earn_type'],
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        earn_type: { not: null },
      },
      _sum: {
        value: true,
      },
    });

    // Hitung total pelanggan unik per tipe
    const distinctTxs = await this.prisma.trn_customer_points.findMany({
      where: {
        customer: { stores_id: { in: storeIds } },
        type: 'point_addition',
        earn_type: { not: null },
      },
      distinct: ['customer_id', 'earn_type'],
      select: {
        earn_type: true,
      },
    });

    const customerCounts = new Map<string, number>();
    for (const tx of distinctTxs) {
      const type = tx.earn_type!;
      customerCounts.set(type, (customerCounts.get(type) || 0) + 1);
    }

    const table = pointsByType.map((row) => {
      const type = row.earn_type || 'Unknown';
      return {
        type: type,
        sumTotalPoints: row._sum?.value || 0,
        totalCustomers: customerCounts.get(type) || 0,
      };
    });

    return {
      dashboard: baseMetrics,
      table: table,
    };
  }

  async getCustomerReport(req: ICustomRequestHeaders, storeIdsString?: string) {
    let storeId: string[] = [];
    if (storeIdsString) {
      storeId = storeIdsString.split(',');
    } else if (req.store_id) {
      storeId = [req.store_id];
    } else {
      throw new BadRequestException('store_ids is required.');
    }

    // 1. Ambil semua data master pelanggan dari toko ini.
    const customersPromise = this.prisma.customer.findMany({
      where: {
        stores_id: { in: storeId },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 2. Agregasi total penjualan (invoice yang sudah 'paid') per pelanggan.
    const salesDataPromise = this.prisma.invoice.groupBy({
      by: ['customer_id'],
      where: {
        store_id: { in: storeId },
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
        store_id: { in: storeId },
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
      salesData.map((item) => [item.customer_id, item._sum?.grand_total || 0]),
    );
    const outstandingMap = new Map(
      outstandingData.map((item) => [
        item.customer_id,
        item._sum?.grand_total || 0,
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
