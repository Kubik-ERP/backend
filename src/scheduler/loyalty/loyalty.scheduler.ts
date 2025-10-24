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
        const now = new Date();

        await this.prisma.trn_customer_points.updateMany({
            where: {
                type: 'point_addition',
                status: 'active',
                expiry_date: { lte: now },
            },
            data: { status: 'expired' },
        });

        const expiredPoints = await this.prisma.trn_customer_points.findMany({
            where: {
                type: 'point_addition',
                expiry_date: { lte: now },
            },
            select: { customer_id: true },
        });

        if (expiredPoints.length === 0) {
            return;
        }

        const customerIds = [...new Set(expiredPoints.map((p) => p.customer_id))];

        for (const customerId of customerIds) {
            await this.recalculateCustomerPoints(customerId);
        }
    }

    private async recalculateCustomerPoints(customerId: string) {
        const earn = await this.prisma.trn_customer_points.aggregate({
            where: {
                customer_id: customerId,
                type: 'point_addition',
                status: 'active'
            },
            _sum: { value: true },
        });

        const redeem = await this.prisma.trn_customer_points.aggregate({
            where: {
                customer_id: customerId,
                type: 'point_deduction',
            },
            _sum: { value: true },
        });

         const totalActivePoints = (earn._sum.value ?? 0) - (redeem._sum.value ?? 0);

        await this.prisma.customer.update({
            where: { id: customerId },
            data: { point: totalActivePoints },
        });
    }
}