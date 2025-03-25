import { Injectable } from '@nestjs/common';
import { CreateStoreDto } from '../dtos/request.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { formatTime } from 'src/common/helpers/common.helpers';
import { Prisma } from '@prisma/client';

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
          name: data.storeName, // DTO pakai `storeName`
          email: data.email,
          phone_number: data.phoneNumber, // DTO pakai `phoneNumber`
          business_type: data.businessType, // DTO pakai `businessType`
          photo: data.photo,
          address: data.streetAddress, // DTO pakai `streetAddress`
          city: data.city,
          postal_code: data.postalCode, // DTO pakai `postalCode`
          building: data.building,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      await prisma.user_has_stores.create({
        data: {
          user_id: userId, // Ganti dengan ID user yang login
          store_id: store.id, // Ambil ID store yang baru dibuat
        },
      });

      // Insert Business Hours (Operational Hours)
      if (data.businessHours?.length) {
        await prisma.operational_hours.createMany({
          data: data.businessHours.map((bh) => ({
            days: this.mapDayToNumber(bh.day), // Convert hari ke angka
            open_time: formatTime(bh.openTime),
            close_time: formatTime(bh.closeTime),
            stores_id: store.id, // Ambil ID store yang baru dibuat
          })),
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
}
