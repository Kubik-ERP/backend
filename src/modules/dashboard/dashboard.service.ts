import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SummaryType } from './dashboard.controller';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const change = ((current - previous) / previous) * 100;
    return parseFloat(change.toFixed(2));
  }

  private async getMetricsForPeriod(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;
    // 1. Calculate Total Sales using Prisma's aggregate feature
    const salesItems = await this.prisma.invoice_details.findMany({
      where: {
        invoice: {
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
          payment_status: 'paid',
          store_id: storeId,
        },
      },
      select: {
        product_price: true,
        qty: true,
      },
    });

    const totalSales = salesItems.reduce((acc, item) => {
      const total = (item.product_price ?? 0) * (item.qty ?? 1);
      return acc + total;
    }, 0);

    // 2. Calculate Total COGS
    const items = await this.prisma.invoice_details.findMany({
      where: {
        invoice: {
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
          payment_status: 'paid',
          store_id: storeId,
        },
      },
      select: {
        product_price: true,
        qty: true,
      },
    });

    const totalGross = items.reduce((acc, item) => {
      const total = (item.product_price ?? 0) * (item.qty ?? 1);
      return acc + total;
    }, 0);

    const nett = await this.prisma.invoice.findMany({
      where: {
        paid_at: {
          gte: startDate,
          lte: endDate,
        },
        store_id: storeId,
        payment_status: 'paid',
      },
      select: {
        grand_total: true,
      },
    });
    const totalNett = nett.reduce((acc, item) => {
      return acc + (item.grand_total ?? 0);
    }, 0);

    return { totalSales, totalGross, totalNett, nett };
  }

  private async getPaymentMethodDashboardData(
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

    const paymentMethods = Array.from(report.entries()).map(
      ([method, data]) => ({
        label: method,
        value: data.nominal,
      }),
    );

    return { paymentMethods };
  }

  async getMonthlySalesThisYear(req: ICustomRequestHeaders, date: Date) {
    const year = date.getFullYear();
    const salesByMonth = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let month = 0; month < 12; month++) {
      // 1. Create the start of the month in the server's local timezone.
      const startDate = new Date(year, month, 1);

      // 2. Create the end of the month in the server's local timezone.
      const endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      // This part is the same, but now it receives the correct local time range.
      // Prisma will correctly convert this local range to the corresponding UTC
      // range for the query.
      const monthlyMetrics = await this.getMetricsForPeriod(
        startDate,
        endDate,
        req,
      );

      salesByMonth.push({
        label: monthNames[month],
        value: monthlyMetrics.totalNett,
      });
    }

    return salesByMonth;
  }

  async getTopProductSales(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    const sales = await this.prisma.invoice_details.findMany({
      where: {
        invoice: {
          store_id: storeId,
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
          payment_status: 'paid',
        },
      },
      include: {
        products: {
          select: {
            name: true,
          },
        },
      },
    });

    const productSales = new Map<string, { name: string; quantity: number }>();

    sales.forEach((item) => {
      if (item.product_id) {
        const existing = productSales.get(item.product_id);
        const quantity = item.qty ?? 1;
        if (existing) {
          existing.quantity += quantity;
        } else {
          productSales.set(item.product_id, {
            name: item.products?.name ?? 'Unknown Product',
            quantity: quantity,
          });
        }
      }
    });

    const sortedProducts = Array.from(productSales.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );

    return sortedProducts.slice(0, 5);
  }

  async getProductStockStatus(req: ICustomRequestHeaders) {
    const storeId = req.store_id;
    const stock = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: storeId,
      },
    });

    let outOfStock = stock.filter((item) => item.stock_quantity === 0);
    let lowStock = stock.filter(
      (item) =>
        item.stock_quantity > 0 &&
        item.stock_quantity < item.minimum_stock_quantity,
    );

    outOfStock.sort((a, b) => a.name.localeCompare(b.name));
    lowStock.sort((a, b) => a.stock_quantity - b.stock_quantity);

    const detailOutOfStock = outOfStock.slice(0, 5);
    const detailLowStock = lowStock.slice(0, 5);

    return {
      stockStatus: {
        available: stock.length - outOfStock.length - lowStock.length,
        outOfStock: detailOutOfStock.length,
        lowStock: detailLowStock.length,
      },
      detailedLowStock: {
        items: detailLowStock.map((item) => ({
          name: item.name,
          stock: item.stock_quantity,
          unit: item.unit,
          minimumStock: item.minimum_stock_quantity,
        })),
        count: detailLowStock.length - 5 < 0 ? 0 : detailLowStock.length - 5,
      },
      detailedOutOfStock: {
        items: detailOutOfStock.map((item) => ({
          name: item.name,
          stock: item.stock_quantity,
          unit: item.unit,
          minimumStock: item.minimum_stock_quantity,
        })),
        count:
          detailOutOfStock.length - 5 < 0 ? 0 : detailOutOfStock.length - 5,
      },
    };
  }

  async getDailySalesInRange(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const dailySales = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStartForQuery = new Date(currentDate);

      const dayEndForQuery = new Date(dayStartForQuery);
      dayEndForQuery.setHours(dayEndForQuery.getHours() + 24);
      dayEndForQuery.setMilliseconds(dayEndForQuery.getMilliseconds() - 1);

      const metrics = await this.getMetricsForPeriod(
        dayStartForQuery,
        dayEndForQuery,
        req,
      );
      const day = String(currentDate.getDate()).padStart(2, '0');
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const year = currentDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      dailySales.push({
        label: formattedDate,
        value: metrics.totalNett,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailySales;
  }

  async getSalesByTimeOnDate(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const hourlySales = [];
    const loopStartDate = new Date(startDate);

    for (let hourOffset = 0; hourOffset < 24; hourOffset++) {
      const hourStart = new Date(loopStartDate);
      hourStart.setUTCHours(loopStartDate.getUTCHours() + hourOffset);
      hourStart.setUTCMinutes(0, 0, 0);

      const hourEnd = new Date(hourStart);
      hourEnd.setUTCMinutes(59, 59, 999);

      const metrics = await this.getMetricsForPeriod(hourStart, hourEnd, req);
      const label = hourStart.toISOString();

      hourlySales.push({
        label: label,
        value: metrics.totalNett,
      });
    }

    return hourlySales;
  }

  async getDashboardSummary(
    rawStartDate: Date,
    rawEndDate: Date,
    type: SummaryType,
    req: ICustomRequestHeaders,
  ) {
    const startDate = new Date(rawStartDate);
    const endDate = new Date(rawEndDate);

    if (startDate > endDate) {
      throw new BadRequestException(
        'Start date must be earlier than or equal to end date',
      );
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const previousPeriodEndDate = new Date(startDate.getTime() - 1);
    const previousPeriodStartDate = new Date(
      previousPeriodEndDate.getTime() - durationMs,
    );

    const [
      currentMetrics,
      previousMetrics,
      timeBasedSales,
      dailySalesData,
      monthlySalesData,
      productSales,
      paymentMethods,
      stockStatus,
    ] = await Promise.all([
      this.getMetricsForPeriod(startDate, endDate, req),
      this.getMetricsForPeriod(
        previousPeriodStartDate,
        previousPeriodEndDate,
        req,
      ),
      this.getSalesByTimeOnDate(startDate, endDate, req),
      this.getDailySalesInRange(startDate, endDate, req),
      this.getMonthlySalesThisYear(req, endDate),
      this.getTopProductSales(startDate, endDate, req),
      this.getPaymentMethodDashboardData(startDate, endDate, req),
      this.getProductStockStatus(req),
    ]);

    const currentGrossProfit =
      currentMetrics.totalSales - currentMetrics.totalGross;
    const previousGrossProfit =
      previousMetrics.totalSales - previousMetrics.totalGross;

    const currentNettProfit = currentGrossProfit;
    const previousNettProfit = previousGrossProfit;

    const summary = {
      // sales kotor (ini itu brarti ya penjualan total secara kasar, tunai dan nontunai, smua pokok e) - retur penjualan
      totalSales: {
        value: currentMetrics.totalNett,
        percentageChange: this.calculatePercentageChange(
          currentMetrics.totalNett,
          previousMetrics.totalNett,
        ),
      },
      // persediaan awal + pembelian persediaan - persediaan akhir (hasil dari pembelian barang)
      totalCostOfGoodSold: {
        value: currentMetrics.totalGross,
        percentageChange: this.calculatePercentageChange(
          currentMetrics.totalGross,
          previousMetrics.totalGross,
        ),
      },
      // sales kotor - cogs
      totalGrossProfit: {
        value: currentGrossProfit,
        percentageChange: this.calculatePercentageChange(
          currentGrossProfit,
          previousGrossProfit,
        ),
      },
      // dr kotak 3 , liat lagi ada expense apalagi, depre, listrik, gaji, dkk, sampe kluar EBIT / Earning before interest atau tax, trus kurangi interest expense kalo ada, kalo g ada ya ws brati langsung masuk earning becore tax, trus kurangi sama tax expense e brapa, trus ketemu net profit e
      totalNettProfit: {
        value: currentNettProfit,
        percentageChange: this.calculatePercentageChange(
          currentNettProfit,
          previousNettProfit,
        ),
      },
    };
    let salesData;
    if (type === 'time') {
      salesData = timeBasedSales;
    } else if (type === 'days') {
      salesData = dailySalesData;
    } else if (type === 'month') {
      salesData = monthlySalesData;
    }
    return {
      summary,
      salesData,
      productSales,
      paymentMethods,
      stockStatus,
    };
  }
}
