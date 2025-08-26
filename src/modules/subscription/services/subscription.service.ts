import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubsPackageDto } from '../dtos/create.dto';
import { permission } from 'process';
import { UUID } from 'crypto';
import { DateTime } from 'luxon';
import { connect } from 'http2';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscriptions() {
    return await this.prisma.subs_package.findMany({
      include: {
        sub_package_access: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  async createSubscription(data: CreateSubsPackageDto) {
    return this.prisma.subs_package.create({
      data: {
        package_name: data.package_name,
        is_active: data.is_active,
        sub_package_access: {
          create: data.access_id.map((access_id) => ({
            permission_id: access_id,
          })),
        },
      },
      include: {
        sub_package_access: true,
      },
    });
  }

  async updateSubscription(id: string, data: CreateSubsPackageDto) {
    return await this.prisma.subs_package.update({
      where: { id },
      data: {
        package_name: data.package_name,
        is_active: data.is_active,
        sub_package_access: {
          deleteMany: {},
          create: data.access_id.map((access_id) => ({
            permission_id: access_id,
          })),
        },
      },
      include: {
        sub_package_access: true,
      },
    });
  }

  async deleteSubscription(id: string) {
    return await this.prisma.subs_package.delete({ where: { id } });
  }

  async getPermissionLists() {
    return await this.prisma.permission_categories.findMany({
      include: {
        permissions: true,
      },
    });
  }

  async assignSubscription(
    email: string,
    subscriptionId: string,
    expiredAt: Date,
  ) {
    const sub = await this.prisma.subs_package.findUnique({
      where: {
        id: subscriptionId,
      },
    });

    if (!sub) {
      throw new BadRequestException('Subscription not found');
    }

    return await this.prisma.users.update({
      where: {
        email: email,
      },
      data: {
        subs_id: subscriptionId,
        sub_expired_at: new Date(expiredAt),
      },
    });
  }
}
