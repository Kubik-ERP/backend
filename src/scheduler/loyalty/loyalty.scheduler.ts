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
        const expiredPoints = await this.prisma.trn_customer_points.findMany({
            where: {
                type: 'point_addition',
                expiry_date: { lt: today }, // sudah lewat masa berlaku
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

        this.logger.log(`Expired points recalculated for ${customerIds.length} customers.`);
    }

    private async recalculateCustomerPoints(customerId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [earn, redeem] = await Promise.all([
            this.prisma.trn_customer_points.aggregate({
                where: {
                    customer_id: customerId,
                    type: 'point_addition',
                    expiry_date: { gte: today }
                },
                _sum: { value: true },
            }),
            this.prisma.trn_customer_points.aggregate({
                where: {
                    customer_id: customerId,
                    type: 'point_deduction',
                },
                _sum: { value: true },
            }),
        ]);

        const totalActivePoints = (earn._sum.value ?? 0) - (redeem._sum.value ?? 0);

        await this.prisma.customer.update({
            where: { id: customerId },
            data: { point: totalActivePoints },
        });

        this.logger.log(`Customer ${customerId} points updated to ${totalActivePoints}`);
    }
}