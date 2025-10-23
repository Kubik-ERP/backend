import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LoyaltyScheduler {
  private readonly logger = new Logger(LoyaltyScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // Jalankan setiap hari jam 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLoyaltyPointExpiration() {
    this.logger.log('Running loyalty point expiration job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ambil semua transaksi earn yang sudah expired
    const expiredPoints =
      await this.prisma.customer_loyalty_transactions.findMany({
        where: {
          type: 'earn',
          expired_at: { lt: today }, // sudah lewat masa berlaku
        },
      });

    if (expiredPoints.length === 0) {
      this.logger.log('No expired points found today.');
      return;
    }

    // Dapatkan unique customer_id
    const customerIds = [...new Set(expiredPoints.map((p) => p.customer_id))];

    for (const customerId of customerIds) {
      await this.recalculateCustomerPoints(customerId);
    }

    this.logger.log(
      `Expired points recalculated for ${customerIds.length} customers.`,
    );
  }

  private async recalculateCustomerPoints(customerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [earn, adjustment, redeem] = await Promise.all([
      this.prisma.customer_loyalty_transactions.aggregate({
        where: {
          customer_id: customerId,
          type: 'earn',
          expired_at: { gte: today }, // hanya yang masih aktif
        },
        _sum: { points: true },
      }),
      this.prisma.customer_loyalty_transactions.aggregate({
        where: {
          customer_id: customerId,
          type: 'adjustment',
        },
        _sum: { points: true },
      }),
      this.prisma.customer_loyalty_transactions.aggregate({
        where: {
          customer_id: customerId,
          type: 'redeem',
        },
        _sum: { points: true },
      }),
    ]);

    const totalActivePoints =
      (earn._sum.points ?? 0) +
      (adjustment._sum.points ?? 0) -
      (redeem._sum.points ?? 0);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { point: totalActivePoints },
    });

    this.logger.log(
      `Customer ${customerId} points updated to ${totalActivePoints}`,
    );
  }
}
