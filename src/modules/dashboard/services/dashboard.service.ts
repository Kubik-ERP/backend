import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  async getDashboardData(storeId: string, date: Date): Promise<any | any[]> {
    console.log(storeId, date);
    //TODO: get data below by store and date
    const totalSales = 0;
    const costOfGoodsSold = 0;
    const grossProfit = totalSales - costOfGoodsSold;
    const nettProfit = grossProfit - 0; // Assuming no other expenses for simplicity
    const totalExpenses = 0;
    const totalRevenue = totalSales - totalExpenses;
    const topProducts: any[] = [];
    const topCustomers: any[] = [];
    const latestSales: any[] = [];
    const stockAvailability: any[] = [];
    const lowStockProducts: any[] = [];
    const outOfStockProducts: any[] = [];

    return {
      totalSales,
      costOfGoodsSold,
      grossProfit,
      nettProfit,
      totalExpenses,
      totalRevenue,
      topProducts,
      topCustomers,
      latestSales,
      stockAvailability,
      lowStockProducts,
      outOfStockProducts,
    };
  }
}
