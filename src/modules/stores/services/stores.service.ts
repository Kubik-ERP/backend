import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto, UpdateProfileDto } from '../dtos/request.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { formatDate, formatTime } from 'src/common/helpers/common.helpers';
import { Prisma } from '@prisma/client';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { StoresListDto } from '../dtos/stores-list.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  public async createStore(
    data: CreateStoreDto,
    userId: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const store = await prisma.stores.create({
        data: {
          id: uuidv4(),
          name: data.storeName,
          email: data.email,
          phone_number: data.phoneNumber,
          business_type: data.businessType,
          photo: data.photo ?? null,
          address: data.streetAddress,
          city: data.city,
          postal_code: data.postalCode,
          building: data.building,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      await prisma.user_has_stores.create({
        data: {
          user_id: userId,
          store_id: store.id,
        },
      });
      const parsedBusinessHours = data.businessHours;
      if (parsedBusinessHours?.length) {
        await prisma.operational_hours.createMany({
          data: parsedBusinessHours.map((bh) => ({
            days: this.mapDayToNumber(bh.day),
            open_time: bh.openTime,
            close_time: bh.closeTime,
            stores_id: store.id,
          })),
        });
      }

      // clone role_permissions to store_role_permissions
      // NOTE: sengaja di filter sub_package_access, karena akan dilakukan ketika get.
      const templateRolePermissions = await prisma.role_permissions.findMany();
      const storeRolePermissions = templateRolePermissions.map((rp) => ({
        store_id: store.id,
        role_id: rp.role_id,
        permission_id: rp.permission_id,
      }));
      await prisma.store_role_permissions.createMany({
        data: storeRolePermissions,
      });

      const existingSetting = await prisma.invoice_settings.findUnique({
        where: { store_id: store.id },
      });
      if (!existingSetting) {
        // note: Create default invoice settings for the new store
        await prisma.invoice_settings.create({
          data: {
            store_id: store.id,
            uid: null,
            company_logo_url: null,
            footer_text: 'footer text',
            is_automatically_print_receipt: true,
            is_automatically_print_kitchen: false,
            is_automatically_print_table: false,
            is_show_company_logo: true,
            is_show_store_location: true,
            is_hide_cashier_name: false,
            is_hide_order_type: false,
            is_hide_queue_number: false,
            is_show_table_number: true,
            is_hide_item_prices: false,
            is_show_footer: true,
            increment_by: 1,
            reset_sequence: 'Daily',
            starting_number: 1,
          },
        });
      }
    });
  }

  private mapDayToNumber(day: string): number {
    const daysMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return daysMap[day] ?? -1; // -1 kalau nama hari gak valid
  }

  public async updateStore(
    storeId: string,
    ownerId: number,
    data: CreateStoreDto,
  ): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const store = await prisma.stores.findUnique({
        where: { id: storeId, user_has_stores: { some: { user_id: ownerId } } },
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      const updateData: any = {
        name: data.storeName,
        email: data.email,
        phone_number: data.phoneNumber,
        business_type: data.businessType,
        photo: data.photo, // bisa undefined
        address: data.streetAddress,
        city: data.city,
        postal_code: data.postalCode,
        building: data.building,
        updated_at: new Date(),
      };

      // Hapus key yang nilainya undefined
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      // Update store details
      await prisma.stores.update({
        where: { id: storeId },
        data: updateData,
      });

      // Update Business Hours
      if (data.businessHours?.length) {
        await prisma.operational_hours.deleteMany({
          where: { stores_id: storeId },
        });

        await prisma.operational_hours.createMany({
          data: data.businessHours.map((bh) => ({
            days: this.mapDayToNumber(bh.day),
            open_time: formatTime(bh.openTime),
            close_time: formatTime(bh.closeTime),
            stores_id: storeId,
          })),
        });
      }

      const existingSetting = await prisma.invoice_settings.findUnique({
        where: { store_id: store.id },
      });
      if (!existingSetting) {
        await prisma.invoice_settings.create({
          data: {
            store_id: store.id,
            uid: null,
            company_logo_url: null,
            footer_text: 'footer text',
            is_automatically_print_receipt: true,
            is_automatically_print_kitchen: false,
            is_automatically_print_table: false,
            is_show_company_logo: true,
            is_show_store_location: true,
            is_hide_order_type: false,
            is_hide_queue_number: false,
            is_show_table_number: true,
            is_hide_item_prices: false,
            is_show_footer: true,
            increment_by: 1,
            reset_sequence: 'Daily',
            starting_number: 1,
          },
        });
      }
    });
  }

  public async deleteStore(storeId: string, userId: number): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      const store = await prisma.stores.findUnique({
        where: { id: storeId, user_has_stores: { some: { user_id: userId } } },
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      await prisma.operational_hours.deleteMany({
        where: { stores_id: storeId },
      });

      await prisma.user_has_stores.deleteMany({
        where: { store_id: storeId },
      });

      await prisma.stores.delete({
        where: { id: storeId },
      });
    });
  }

  public async getStoreById(storeId: string): Promise<any> {
    return await this.prisma.stores.findUnique({
      where: { id: storeId },
      include: {
        operational_hours: {
          orderBy: {
            days: 'asc',
          },
        },
        user_has_stores: true,
      },
    });
  }

  public async getStoreByUserId(userId: number) {
    const userWithStores = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        users_has_banks: true,
        user_has_stores: {
          include: {
            stores: {
              include: {
                operational_hours: {
                  orderBy: {
                    days: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithStores) {
      return {
        user: null,
        stores: [],
      };
    }

    const userBanks = userWithStores.users_has_banks.map((bank) => ({
      bankName: bank.bank_name || null,
      bank_id: bank.id,
      accountNumber: bank.account_number,
      accountName: bank.account_name || null,
    }));

    const stores = userWithStores.user_has_stores.map((userStore) => {
      const store = userStore.stores;

      const groupedOperationalHours = store.operational_hours.reduce(
        (acc: any, item: any) => {
          const day = item.days;
          if (!acc[day]) {
            acc[day] = {
              days: day,
              times: [],
            };
          }
          acc[day].times.push({
            openTime: item.open_time,
            closeTime: item.close_time,
          });
          return acc;
        },
        {},
      );

      return {
        id: store.id,
        name: store.name,
        businessType: store.business_type,
        photo: store.photo,
        address: store.address,
        city: store.city,
        postalCode: store.postal_code,
        building: store.building,
        createdAt: store.created_at ? formatDate(store.created_at) : null,
        updatedAt: store.updated_at ? formatDate(store.updated_at) : null,
        operationalHours: Object.values(groupedOperationalHours),
      };
    });

    const user = {
      id: userWithStores.id,
      name: userWithStores.fullname,
      email: userWithStores.email,
      phone: userWithStores.phone,
      image: userWithStores.picture_url,
      banks: userBanks,
    };

    return {
      user,
      stores,
    };
  }

  public async getAllStores(dto: StoresListDto, header: ICustomRequestHeaders) {
    const ownerId = header.user.ownerId;
    if (!ownerId) {
      throw new BadRequestException('Owner not found');
    }

    // --- Fetch data
    const [items, total] = await Promise.all([
      this.prisma.stores.findMany({
        where: {
          user_has_stores: {
            some: { user_id: ownerId },
          },
        },
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy: {
          [dto.orderBy]: dto.orderDirection,
        },
      }),
      this.prisma.stores.count({
        where: {
          user_has_stores: {
            some: { user_id: ownerId },
          },
        },
      }),
    ]);

    return {
      items: items,
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  public async updateProfile(userId: number, body: UpdateProfileDto) {
    const user = await this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        fullname: body.fullname,
        email: body.email,
        phone: body.phone,
        picture_url: body.image,
      },
    });

    const userSafe = {
      ...user,
      verified_at: user.verified_at?.toString(),
      created_at: user.created_at?.toString(),
      updated_at: user.updated_at?.toString(),
      deleted_at: user.deleted_at?.toString(),
    };

    return {
      message: 'Profile updated successfully.',
      data: userSafe,
    };
  }

  public async getOperationalHoursByStore(
    header: ICustomRequestHeaders,
  ): Promise<
    { day: string; hours: { openTime: string; closeTime: string }[] }[]
  > {
    const hours = await this.fetchOperationalHours(header.store_id!);

    const dayMap = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const grouped: Record<number, { openTime: string; closeTime: string }[]> =
      {};

    for (const item of hours) {
      if (item.days === null || item.days === undefined) continue;

      if (!grouped[item.days]) {
        grouped[item.days] = [];
      }

      grouped[item.days].push({
        openTime: item.open_time ?? 'Closed',
        closeTime: item.close_time ?? 'Closed',
      });
    }

    const result = dayMap.map((dayName, dayIndex) => {
      const slots = grouped[dayIndex];
      return {
        day: dayName,
        hours:
          slots && slots.length > 0
            ? slots
            : [{ openTime: 'Closed', closeTime: 'Closed' }],
      };
    });

    return result;
  }

  public async updateOperationalHours(
    header: ICustomRequestHeaders,
    ownerId: number,
    businessHours: CreateStoreDto['businessHours'],
  ): Promise<void> {
    const storeID = header.store_id;
    const isValid = await this.validateStore(storeID!, ownerId);
    if (!isValid) {
      throw new BadRequestException('Unauthorized or store not found');
    }

    await this.prisma.$transaction(async (prisma) => {
      await this.deleteOperationalHours(storeID!, prisma);
      if (businessHours?.length) {
        await prisma.operational_hours.createMany({
          data: businessHours.map((bh) => ({
            days: this.mapDayToNumber(bh.day),
            open_time: formatTime(bh.openTime),
            close_time: formatTime(bh.closeTime),
            stores_id: storeID!,
          })),
        });
      }
    });
  }

  public async validateStore(
    storeId: string,
    ownerId: number,
  ): Promise<boolean> {
    const store = await this.prisma.stores.findUnique({
      where: { id: storeId, user_has_stores: { some: { user_id: ownerId } } },
    });
    return !!store;
  }

  private async fetchOperationalHours(storeId: string) {
    return this.prisma.operational_hours.findMany({
      where: { stores_id: storeId },
      orderBy: { days: 'asc' },
    });
  }

  private async deleteOperationalHours(
    storeId: string,
    prisma: Prisma.TransactionClient,
  ): Promise<void> {
    await prisma.operational_hours.deleteMany({
      where: { stores_id: storeId },
    });
  }
}
