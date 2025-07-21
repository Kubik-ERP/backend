import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateAccountStoreConfigurationDto } from '../dtos/store-table.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreTableService {
  constructor(private prisma: PrismaService) {}

  async createConfiguration(
    dto: CreateAccountStoreConfigurationDto,
    storeId: string,
    userId: string,
  ) {
    const result = [];

    for (const floor of dto.configurations) {
      const floorId = uuidv4();
      const createdFloor = await this.prisma.store_floors.create({
        data: {
          id: floorId,
          uid: userId,
          store_id: storeId,
          floor_name: floor.floorName,
        },
      });

      if (floor.tables?.length) {
        const tableData = floor.tables.map((table) => ({
          id: uuidv4(),
          uid: userId,
          store_id: storeId,
          floor_id: floorId,
          name: table.name,
          seats: table.seats,
          shape: table.shape,
          width: table.width,
          height: table.height,
          position_x: table.positionX,
          position_y: table.positionY,
          is_enable_qr_code: table.isEnableQrCode,
        }));

        await this.prisma.store_tables.createMany({ data: tableData });
      }

      result.push(createdFloor);
    }

    return { success: true, created: result };
  }

  async update(
    floorId: string,
    dto: CreateAccountStoreConfigurationDto,
    storeId: string,
    userId: string,
  ) {
    // validasi floor exist
    const floor = await this.prisma.store_floors.findFirst({
      where: { id: floorId, store_id: storeId },
    });

    if (!floor) {
      throw new Error('Floor tidak ditemukan');
    }

    // hanya boleh update satu konfigurasi (1 floor) per request
    const config = dto.configurations[0];
    if (!config) throw new Error('Data konfigurasi kosong');

    // update nama floor
    await this.prisma.store_floors.update({
      where: { id: floorId },
      data: {
        floor_name: config.floorName,
      },
    });

    // hapus semua meja lama
    await this.prisma.store_tables.deleteMany({
      where: { floor_id: floorId },
    });

    // insert ulang semua meja baru
    if (config.tables?.length) {
      const tableData = config.tables.map((table) => ({
        id: uuidv4(),
        uid: userId,
        store_id: storeId,
        floor_id: floorId,
        name: table.name,
        seats: table.seats,
        shape: table.shape,
        width: table.width,
        height: table.height,
        position_x: table.positionX,
        position_y: table.positionY,
        is_enable_qr_code: table.isEnableQrCode,
      }));

      await this.prisma.store_tables.createMany({ data: tableData });
    }

    return { success: true, updatedFloorId: floorId };
  }

  async findAll(storeId: string) {
    return this.prisma.store_floors.findMany({
      where: { store_id: storeId },
      include: {
        store_tables: true,
      },
    });
  }

  async findOne(id: string, storeId: string) {
    return this.prisma.store_floors.findFirst({
      where: { id, store_id: storeId },
      include: { store_tables: true },
    });
  }

  async delete(id: string, storeId: string) {
    return this.prisma.store_floors.deleteMany({
      where: { id, store_id: storeId },
    });
  }
}
