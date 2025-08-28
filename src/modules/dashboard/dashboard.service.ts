import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

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
          complete_order_at: {
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
          complete_order_at: {
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

    return { totalSales, totalGross };
  }

  private async getTotalSalesThisYear(req: ICustomRequestHeaders) {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    const endDate = new Date(new Date().getFullYear(), 11, 31);
    const currentYearMetrics = await this.getMetricsForPeriod(
      startDate,
      endDate,
      req,
    );
    return currentYearMetrics.totalSales;
  }

  private async getTotalSalesLastYear(req: ICustomRequestHeaders) {
    const startDate = new Date(new Date().getFullYear() - 1, 0, 1);
    const endDate = new Date(new Date().getFullYear() - 1, 11, 31);
    const lastYearMetrics = await this.getMetricsForPeriod(
      startDate,
      endDate,
      req,
    );
    return lastYearMetrics.totalSales;
  }

  async getMonthlySalesThisYear(req: ICustomRequestHeaders) {
    const year = new Date().getFullYear();
    const salesByMonth = [];
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      const monthlyMetrics = await this.getMetricsForPeriod(
        startDate,
        endDate,
        req,
      );

      salesByMonth.push({
        month: monthNames[month],
        sales: monthlyMetrics.totalSales,
      });
    }

    return salesByMonth;
  }

  async getTopProductSales(
    // startDate: Date,
    // endDate: Date,
    req: ICustomRequestHeaders,
  ) {
    const storeId = req.store_id;

    const sales = await this.prisma.invoice_details.findMany({
      where: {
        invoice: {
          store_id: storeId,
          // complete_order_at: {
          //   gte: startDate,
          //   lte: endDate,
          // },
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
        stores_has_master_inventory_items: {
          some: {
            stores_id: storeId,
          },
        },
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

  async getDashboardSummary(
    startDate: Date,
    endDate: Date,
    req: ICustomRequestHeaders,
  ) {
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
      monthlySalesData,
      yearlySalesData,
      previousYearSalesData,
      productSales,
      stockStatus,
    ] = await Promise.all([
      this.getMetricsForPeriod(startDate, endDate, req),
      this.getMetricsForPeriod(
        previousPeriodStartDate,
        previousPeriodEndDate,
        req,
      ),
      this.getMonthlySalesThisYear(req),
      this.getTotalSalesThisYear(req),
      this.getTotalSalesLastYear(req),
      this.getTopProductSales(req),
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
        value: currentMetrics.totalSales,
        percentageChange: this.calculatePercentageChange(
          currentMetrics.totalSales,
          previousMetrics.totalSales,
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

    return {
      summary,
      monthlySalesData,
      latestSales: {
        value: yearlySalesData,
        percentageChange: this.calculatePercentageChange(
          yearlySalesData,
          previousYearSalesData,
        ),
      },
      productSales,
      stockStatus,
    };
  }
}
