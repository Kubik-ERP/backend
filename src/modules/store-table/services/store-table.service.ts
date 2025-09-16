import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateAccountStoreConfigurationDto } from '../dtos/store-table.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreTableService {
  constructor(private prisma: PrismaService) {}

  async createConfiguration(
    dto: CreateAccountStoreConfigurationDto,
    storeId: string,
    ownerId: number,
  ) {
    const result = [];

    for (const floor of dto.configurations) {
      const floorId = uuidv4();
      const createdFloor = await this.prisma.store_floors.create({
        data: {
          id: floorId,
          uid: ownerId,
          store_id: storeId,
          floor_name: floor.floorName,
        },
      });

      if (floor.tables?.length) {
        const tableData = floor.tables.map((table) => ({
          id: uuidv4(),
          uid: ownerId,
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
    ownerId: number,
  ) {
    const floor = await this.prisma.store_floors.findFirst({
      where: { id: floorId, store_id: storeId, uid: ownerId },
    });

    if (!floor)
      throw new ForbiddenException('Data tidak ditemukan atau bukan milikmu');

    const config = dto.configurations[0];
    if (!config) throw new NotFoundException('Data konfigurasi kosong');

    await this.prisma.store_floors.update({
      where: { id: floorId },
      data: {
        floor_name: config.floorName,
      },
    });

    await this.prisma.store_tables.deleteMany({
      where: { floor_id: floorId },
    });

    if (config.tables?.length) {
      const tableData = config.tables.map((table) => ({
        id: uuidv4(),
        uid: ownerId,
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

  async findAll(storeId: string, ownerId: number) {
    const floors = await this.prisma.store_floors.findMany({
      where: { store_id: storeId, uid: ownerId },
      include: {
        store_tables: true,
      },
    });

    // Get all unpaid invoices for this store
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        store_id: storeId,
        payment_status: 'unpaid',
        table_code: { not: null },
      },
      select: {
        table_code: true,
      },
    });

    // Create a set of occupied table codes for quick lookup
    const occupiedTableCodes = new Set(
      unpaidInvoices.map((invoice) => invoice.table_code).filter(Boolean),
    );

    // Add statusTable and floorName to each table
    const floorsWithStatus = floors.map((floor) => ({
      ...floor,
      store_tables: floor.store_tables.map((table) => ({
        ...table,
        floorName: floor.floor_name,
        statusTable: occupiedTableCodes.has(table.name)
          ? 'occupied'
          : 'available',
      })),
    }));

    return floorsWithStatus;
  }

  async findOne(id: string, storeId: string, ownerId: number) {
    const floor = await this.prisma.store_floors.findFirst({
      where: { id, store_id: storeId, uid: ownerId },
      include: { store_tables: true },
    });

    if (!floor)
      throw new ForbiddenException('Data tidak ditemukan atau bukan milikmu');
    return floor;
  }

  async delete(id: string, storeId: string, ownerId: number) {
    const floor = await this.prisma.store_floors.findFirst({
      where: { id, store_id: storeId, uid: ownerId },
    });

    if (!floor)
      throw new ForbiddenException('Data tidak ditemukan atau bukan milikmu');

    await this.prisma.store_tables.deleteMany({
      where: { floor_id: id },
    });

    await this.prisma.store_floors.delete({
      where: { id },
    });

    return { success: true, deletedFloorId: id };
  }
}
