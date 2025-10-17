import { Injectable, ForbiddenException } from '@nestjs/common';
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
    const ownerIdBigInt = BigInt(ownerId);
    const result = [];

    for (const floor of dto.configurations) {
      const floorId = floor.id ?? uuidv4();
      const createdFloor = await this.prisma.store_floors.create({
        data: {
          id: floorId,
          uid: ownerIdBigInt,
          store_id: storeId,
          floor_name: floor.floorName,
        },
      });

      if (floor.tables?.length) {
        const tableData = floor.tables.map((table) => ({
          id: table.id ?? uuidv4(),
          uid: ownerIdBigInt,
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
    dto: CreateAccountStoreConfigurationDto,
    storeId: string,
    ownerId: number,
  ) {
    const ownerIdBigInt = BigInt(ownerId);
    const configurations = dto.configurations ?? [];

    return this.prisma.$transaction(async (tx) => {
      const existingFloors = await tx.store_floors.findMany({
        where: { store_id: storeId, uid: ownerIdBigInt },
        include: { store_tables: true },
      });

      const floorMap = new Map(
        existingFloors.map((floor) => [floor.id, floor]),
      );

      const existingTables = existingFloors.flatMap(
        (floor) => floor.store_tables,
      );
      const tableMap = new Map(
        existingTables.map((table) => [table.id, table]),
      );

      const floorIdsToKeep = new Set<string>();
      const tableIdsToKeep = new Set<string>();

      for (const config of configurations) {
        const floorId = config.id ?? uuidv4();
        const existingFloor = config.id ? floorMap.get(config.id) : undefined;

        if (config.id && !existingFloor) {
          throw new ForbiddenException(
            'Data tidak ditemukan atau bukan milikmu',
          );
        }

        if (existingFloor) {
          await tx.store_floors.update({
            where: { id: floorId },
            data: {
              floor_name: config.floorName,
            },
          });
        } else {
          await tx.store_floors.create({
            data: {
              id: floorId,
              uid: ownerIdBigInt,
              store_id: storeId,
              floor_name: config.floorName,
            },
          });
        }

        floorIdsToKeep.add(floorId);

        const tables = config.tables ?? [];

        for (const table of tables) {
          const tableId = table.id ?? uuidv4();
          const existingTable = table.id ? tableMap.get(table.id) : undefined;

          if (table.id && !existingTable) {
            throw new ForbiddenException(
              'Data tidak ditemukan atau bukan milikmu',
            );
          }

          const tableData = {
            uid: ownerIdBigInt,
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
          };

          if (existingTable) {
            if (
              existingTable.store_id !== storeId ||
              existingTable.uid !== ownerIdBigInt
            ) {
              throw new ForbiddenException(
                'Data tidak ditemukan atau bukan milikmu',
              );
            }

            await tx.store_tables.update({
              where: { id: tableId },
              data: tableData,
            });
          } else {
            await tx.store_tables.create({
              data: { id: tableId, ...tableData },
            });
          }

          tableIdsToKeep.add(tableId);
          tableMap.set(tableId, {
            ...(existingTable ?? {}),
            ...tableData,
            id: tableId,
            status_override: existingTable?.status_override ?? null,
            created_at: existingTable?.created_at ?? null,
            updated_at: existingTable?.updated_at ?? null,
          });
        }
      }

      const floorsToDelete = existingFloors
        .filter((floor) => !floorIdsToKeep.has(floor.id))
        .map((floor) => floor.id);

      const tablesToDelete = existingTables
        .filter((table) => !tableIdsToKeep.has(table.id))
        .map((table) => table.id);

      if (tablesToDelete.length) {
        await tx.store_tables.deleteMany({
          where: {
            id: { in: tablesToDelete },
            store_id: storeId,
          },
        });
      }

      if (floorsToDelete.length) {
        await tx.store_floors.deleteMany({
          where: {
            id: { in: floorsToDelete },
            store_id: storeId,
            uid: ownerIdBigInt,
          },
        });
      }

      const updatedFloors = await tx.store_floors.findMany({
        where: { store_id: storeId, uid: ownerIdBigInt },
        include: { store_tables: true },
      });

      return { success: true, configurations: updatedFloors };
    });
  }

  async findAll(storeId: string, ownerId: number) {
    const ownerIdBigInt = BigInt(ownerId);

    // Fetch all floors and their associated tables
    const floors = await this.prisma.store_floors.findMany({
      where: { store_id: storeId, uid: ownerIdBigInt },
      include: {
        store_tables: true,
      },
    });

    // Get all unpaid invoices for this store (used to determine occupied tables automatically)
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

    // Add floor name and determine table status based on override or invoice status
    const floorsWithStatus = floors.map((floor) => ({
      ...floor,
      store_tables: floor.store_tables.map((table) => {
        // Automatic status based on invoice
        const autoStatus = occupiedTableCodes.has(table.name)
          ? 'occupied'
          : 'available';

        // If there’s a manual override from the cashier, use it instead
        const finalStatus = table.status_override ?? autoStatus;

        return {
          ...table,
          floorName: floor.floor_name,
          statusTable: finalStatus,
          from: table.status_override ? 'manual' : 'auto', // Indicates the source of the current status
        };
      }),
    }));

    return floorsWithStatus;
  }

  async findOne(id: string, storeId: string, ownerId: number) {
    const ownerIdBigInt = BigInt(ownerId);
    const floor = await this.prisma.store_floors.findFirst({
      where: { id, store_id: storeId, uid: ownerIdBigInt },
      include: { store_tables: true },
    });

    if (!floor)
      throw new ForbiddenException('Data tidak ditemukan atau bukan milikmu');
    return floor;
  }

  async updateTableOverrideStatus(
    storeId: string,
    tableId: string,
    newStatus: 'available' | 'occupied',
  ) {
    // Find the table first
    const table = await this.prisma.store_tables.findFirst({
      where: {
        id: tableId,
        store_id: storeId,
      },
    });

    if (!table) {
      throw new ForbiddenException('Meja tidak ditemukan atau bukan milikmu');
    }

    // Update the status_override (can be 'available' or 'occupied')
    const updatedTable = await this.prisma.store_tables.update({
      where: { id: table.id },
      data: {
        status_override: newStatus,
      },
    });

    // Return the updated result
    return { success: true, table: updatedTable };
  }
}
