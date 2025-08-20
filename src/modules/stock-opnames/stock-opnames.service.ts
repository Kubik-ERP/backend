import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { UpdateStockOpnameDto } from './dto/update-stock-opname.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StockOpnamesListDto } from './dto/stock-opnames-list.dto';
import { Prisma, stock_opname_status } from '@prisma/client';
import { camelToSnake } from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import {
  generateNextId,
  idToNumber,
  jakartaTime,
} from 'src/common/helpers/common.helpers';

@Injectable()
export class StockOpnamesService {
  constructor(private readonly _prisma: PrismaService) {}

  async create(dto: CreateStockOpnameDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const { items: itemsPayload } = dto;
    if (!itemsPayload?.length) {
      throw new BadRequestException('items is required');
    }

    // --- Fetch + validate items belong to this store
    const itemIds = itemsPayload.map((i) => i.masterInventoryItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
    });

    const invById = new Map(inventoryItems.map((it) => [it.id, it]));
    const missingIds = itemIds.filter((id) => !invById.has(id));
    if (missingIds.length) {
      throw new BadRequestException(
        `Some products do not exist or do not belong to this store: ${missingIds.join(', ')}`,
      );
    }

    if (inventoryItems.length !== itemsPayload.length) {
      throw new BadRequestException('Some products do not exist');
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // Generate next SO code
      const lastSO = await tx.stock_opnames.findFirst({
        orderBy: { created_at: 'desc' },
        select: { code: true },
      });

      // get yyyymmdd
      const date = jakartaTime().toFormat('yyyyMMdd');

      const soCode = generateNextId(
        `STK-${date}`,
        lastSO?.code ? idToNumber(lastSO.code) : 0,
      );

      // Prepare SO items
      const soItems = itemsPayload.map(
        ({ masterInventoryItemId, actualQuantity, notes }) => {
          const inv = invById.get(masterInventoryItemId)!;
          return {
            master_inventory_item_id: masterInventoryItemId,
            expected_quantity: inv.stock_quantity,
            actual_quantity: actualQuantity,
            notes: notes,
          };
        },
      );

      return await tx.stock_opnames.create({
        data: {
          code: soCode,
          status: dto.publishNow
            ? stock_opname_status.on_review
            : stock_opname_status.draft,
          store_id,
          performed_by: header.user.id,
          stock_opname_items: {
            createMany: { data: soItems },
          },
          updated_at: new Date(),
        },
        include: {
          stock_opname_items: {
            include: {
              master_inventory_items: true,
            },
          },
          users: {
            select: {
              fullname: true,
            },
          },
        },
      });
    });

    return result;
  }

  async findAll(query: StockOpnamesListDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // --- Filter
    const filters: Prisma.stock_opnamesWhereInput = {
      store_id,
    };

    // --- Order by
    const orderByField = camelToSnake(query.orderBy);
    const orderDirection = query.orderDirection;
    const orderBy: Prisma.stock_opnamesOrderByWithRelationInput[] = [];
    if (orderByField === 'performed_by') {
      orderBy.push({
        users: {
          fullname: orderDirection,
        },
      });
    } else {
      orderBy.push({ [orderByField]: orderDirection });
    }

    // --- Fetch data
    const [items, total] = await Promise.all([
      this._prisma.stock_opnames.findMany({
        where: filters,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: orderBy,
        include: {
          users: {
            select: {
              fullname: true,
            },
          },
        },
      }),
      this._prisma.stock_opnames.count({
        where: filters,
      }),
    ]);

    return {
      items: items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  async findOne(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    if (!header.user) throw new BadRequestException('user is required');

    // --- ini untuk preview create
    if (id === 'new') {
      // Generate next SO code
      const lastSO = await this._prisma.stock_opnames.findFirst({
        orderBy: { created_at: 'desc' },
        select: { code: true },
      });

      // get yyyymmdd
      const date = jakartaTime().toFormat('yyyyMMdd');

      const soCode = generateNextId(
        `STK-${date}`,
        lastSO?.code ? idToNumber(lastSO.code) : 0,
      );

      // --- Fetch all master inventory items
      const masterInventoryItems =
        await this._prisma.master_inventory_items.findMany({
          where: {
            stores_has_master_inventory_items: {
              some: { stores_id: store_id },
            },
          },
        });

      // --- Prepare stock opname items
      const stockOpnameItems = masterInventoryItems.map((item) => ({
        expected_quantity: item.stock_quantity,
        actual_quantity: 0,
        diff_quantity: 0 - item.stock_quantity,
        master_inventory_item_id: item.id,
        master_inventory_items: {
          id: item.id,
          name: item.name,
          sku: item.sku,
        },
      }));

      return {
        code: soCode,
        performedBy: header.user.id,
        createdAt: new Date(),
        users: {
          fullname: header.user.fullname,
        },
        stockOpnameItems: stockOpnameItems,
      };
    }

    // --- ini untuk preview edit
    const stockOpname = await this._prisma.stock_opnames.findUnique({
      where: { id, store_id },
      include: {
        stock_opname_items: {
          include: {
            master_inventory_items: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        users: {
          select: {
            fullname: true,
          },
        },
      },
    });

    if (!stockOpname) {
      throw new NotFoundException('Stock opname not found');
    }

    return stockOpname;
  }

  async update(
    id: string,
    dto: UpdateStockOpnameDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const { items: itemsPayload } = dto;
    if (!itemsPayload?.length) {
      throw new BadRequestException('items is required');
    }

    // Validate items belong to this store
    const itemIds = itemsPayload.map((i) => i.masterInventoryItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
    });
    const invById = new Map(inventoryItems.map((it) => [it.id, it]));
    const missingIds = itemIds.filter((id) => !invById.has(id));
    if (missingIds.length) {
      throw new BadRequestException(
        `Some products do not exist or do not belong to this store: ${missingIds.join(', ')}`,
      );
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // Ensure SO exists & belongs to store (prevents cross-store updates)
      const existingSO = await tx.stock_opnames.findFirst({
        where: { id, store_id },
        select: { id: true, status: true },
      });
      if (!existingSO) throw new BadRequestException('Stock Opname not found');

      // Check if status allows updates
      const disallowedStatuses = [
        stock_opname_status.verified,
      ] as stock_opname_status[];
      if (disallowedStatuses.includes(existingSO.status)) {
        throw new BadRequestException(
          'Stock Opname is not allowed to be updated',
        );
      }

      // Get existing items
      const existingItems = await tx.stock_opname_items.findMany({
        where: { stock_opname_id: id },
        select: { master_inventory_item_id: true },
      });

      // Find items to delete (exist in DB but not in payload)
      const payloadItemIds = new Set(
        itemsPayload.map((item) => item.masterInventoryItemId),
      );
      const itemsToDelete = existingItems.filter(
        (item) => !payloadItemIds.has(item.master_inventory_item_id),
      );

      // Delete items that are no longer in the payload
      if (itemsToDelete.length > 0) {
        await tx.stock_opname_items.deleteMany({
          where: {
            stock_opname_id: id,
            master_inventory_item_id: {
              in: itemsToDelete.map((item) => item.master_inventory_item_id),
            },
          },
        });
      }

      // Upsert remaining/new items
      await Promise.all(
        itemsPayload.map(
          async ({ masterInventoryItemId, actualQuantity, notes }) => {
            const inv = invById.get(masterInventoryItemId)!;

            return tx.stock_opname_items.upsert({
              where: {
                stock_opname_id_master_inventory_item_id: {
                  stock_opname_id: id,
                  master_inventory_item_id: masterInventoryItemId,
                },
              },
              create: {
                master_inventory_item_id: masterInventoryItemId,
                expected_quantity: inv.stock_quantity,
                actual_quantity: actualQuantity,
                notes: notes,
                stock_opname_id: id,
              },
              update: {
                expected_quantity: inv.stock_quantity,
                actual_quantity: actualQuantity,
                notes: notes,
                updated_at: new Date(),
              },
            });
          },
        ),
      );

      // Update stock opname status if publishing
      return await tx.stock_opnames.update({
        where: { id },
        data: {
          status: dto.publishNow
            ? stock_opname_status.on_review
            : stock_opname_status.draft,
          updated_at: new Date(),
        },
        include: {
          stock_opname_items: {
            include: {
              master_inventory_items: true,
            },
          },
          users: {
            select: {
              fullname: true,
            },
          },
        },
      });
    });

    return result;
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure SO exists & belongs to store (prevents cross-store updates)
    const existingSO = await this._prisma.stock_opnames.findFirst({
      where: { id, store_id },
      select: { id: true, status: true },
    });
    if (!existingSO) throw new NotFoundException('Stock Opname not found');

    const disallowedStatuses = [
      stock_opname_status.verified,
    ] as stock_opname_status[];
    if (disallowedStatuses.includes(existingSO.status)) {
      throw new BadRequestException(
        'Stock Opname is not allowed to be removed',
      );
    }

    // --- Delete SO
    const removedSO = await this._prisma.$transaction(async (tx) => {
      await tx.stock_opname_items.deleteMany({
        where: { stock_opname_id: id },
      });

      return await tx.stock_opnames.delete({
        where: { id },
      });
    });

    return removedSO;
  }

  async verify(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure SO exists & belongs to store (prevents cross-store updates)
    const existingSO = await this._prisma.stock_opnames.findFirst({
      where: { id, store_id },
      select: { id: true, status: true },
    });
    if (!existingSO) throw new NotFoundException('Stock Opname not found');

    const disallowedStatuses = [
      stock_opname_status.verified,
    ] as stock_opname_status[];
    if (disallowedStatuses.includes(existingSO.status)) {
      throw new BadRequestException(
        'Stock Opname is not allowed to be verified',
      );
    }

    return await this._prisma.stock_opnames.update({
      where: { id },
      data: {
        status: stock_opname_status.verified,
        verified_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}
