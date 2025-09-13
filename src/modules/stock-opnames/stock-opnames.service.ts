import {
  BadRequestException,
  Injectable,
  Logger,
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
  requireStoreId,
  requireUser,
} from 'src/common/helpers/common.helpers';

@Injectable()
export class StockOpnamesService {
  private readonly logger = new Logger(StockOpnamesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===== Constants & shared Prisma selections
  private static readonly MUTATION_LOCKED_STATUSES: stock_opname_status[] = [
    stock_opname_status.verified,
  ];

  private static readonly stockOpnameInclude = {
    stock_opname_items: {
      include: {
        master_inventory_items: true,
      },
    },
    users: {
      select: { fullname: true },
    },
  } satisfies Prisma.stock_opnamesInclude;

  private static readonly stockOpnameListInclude = {
    users: { select: { fullname: true } },
  } satisfies Prisma.stock_opnamesInclude;

  // ===== Helpers

  private assertMutable(
    status: stock_opname_status,
    action: 'update' | 'delete' | 'verify',
  ) {
    if (StockOpnamesService.MUTATION_LOCKED_STATUSES.includes(status)) {
      switch (action) {
        case 'verify':
          throw new BadRequestException(
            'Stock Opname is not allowed to be verified',
          );
        case 'delete':
          throw new BadRequestException(
            'Stock Opname is not allowed to be removed',
          );
        case 'update':
          throw new BadRequestException(
            'Stock Opname is not allowed to be updated',
          );
      }
    }
  }

  private async ensureSOInStore(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
    store_id: string,
    select?: Prisma.stock_opnamesSelect,
  ) {
    const so = await tx.stock_opnames.findFirst({
      where: { id, store_id },
      select: select ?? { id: true, status: true },
    });
    if (!so) throw new NotFoundException('Stock Opname not found');
    return so;
  }

  private async validateInventoryItems(
    tx: Prisma.TransactionClient | PrismaService,
    store_id: string,
    itemIds: string[],
  ) {
    const items = await tx.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        store_id: store_id,
      },
    });

    // Map + missing check
    const invById = new Map(items.map((i) => [i.id, i]));
    const missing = itemIds.filter((id) => !invById.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Some products do not exist or do not belong to this store: ${missing.join(', ')}`,
      );
    }
    return invById;
  }

  private async generateNextSoCode(
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    const lastSO = await tx.stock_opnames.findFirst({
      orderBy: { created_at: 'desc' },
      select: { code: true },
    });
    const date = jakartaTime().toFormat('yyyyMMdd'); // yyyymmdd
    return generateNextId(
      `STK-${date}`,
      lastSO?.code ? idToNumber(lastSO.code) : 0,
    );
  }

  private buildOrderBy(
    query: StockOpnamesListDto,
  ): Prisma.stock_opnamesOrderByWithRelationInput[] {
    const orderByField = camelToSnake(query.orderBy);
    const direction = query.orderDirection;
    if (orderByField === 'performed_by') {
      return [{ users: { fullname: direction } }];
    }
    return [
      {
        [orderByField]: direction,
      } as Prisma.stock_opnamesOrderByWithRelationInput,
    ];
  }

  private async calculateStockOpnameTotals(
    tx: Prisma.TransactionClient | PrismaService,
    stockOpnameId: string,
  ) {
    const items = await tx.stock_opname_items.findMany({
      where: { stock_opname_id: stockOpnameId },
      select: {
        actual_quantity: true,
        diff_quantity: true,
      },
    });

    const total_item_checked = items.reduce(
      (sum, item) => sum + (item.actual_quantity ?? 0),
      0,
    );
    const stock_mismatches = items.reduce(
      (sum, item) => sum + (item.diff_quantity ?? 0),
      0,
    );

    return { total_item_checked, stock_mismatches };
  }

  private buildSoItems(
    payload: {
      masterInventoryItemId: string;
      actualQuantity: number;
      notes?: string | null;
    }[],
    invById: Map<string, { stock_quantity: number }>,
  ) {
    return payload.map(({ masterInventoryItemId, actualQuantity, notes }) => {
      const inv = invById.get(masterInventoryItemId)!;
      return {
        master_inventory_item_id: masterInventoryItemId,
        expected_quantity: inv.stock_quantity,
        actual_quantity: actualQuantity,
        diff_quantity: actualQuantity - inv.stock_quantity,
        notes: notes ?? null,
      };
    });
  }

  // ===== CRUD
  async create(dto: CreateStockOpnameDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Creating new stock opname for store ${store_id}`);

    const itemsPayload = dto.items ?? [];
    if (!itemsPayload.length)
      throw new BadRequestException('items is required');

    const itemIds = itemsPayload.map((i) => i.masterInventoryItemId);

    const result = await this.prisma.$transaction(async (tx) => {
      // Validate inventory against store
      const invById = await this.validateInventoryItems(tx, store_id, itemIds);

      const soCode = await this.generateNextSoCode(tx);
      const soItems = this.buildSoItems(itemsPayload, invById);

      // First create the stock opname with items
      const stockOpname = await tx.stock_opnames.create({
        data: {
          code: soCode,
          status: dto.publishNow
            ? stock_opname_status.on_review
            : stock_opname_status.draft,
          store_id,
          performed_by: header.user.id,
          stock_opname_items: { createMany: { data: soItems } },
          updated_at: new Date(),
        },
        include: StockOpnamesService.stockOpnameInclude,
      });

      // Calculate and update totals
      const totals = await this.calculateStockOpnameTotals(tx, stockOpname.id);
      return tx.stock_opnames.update({
        where: { id: stockOpname.id },
        data: totals,
        include: StockOpnamesService.stockOpnameInclude,
      });
    });

    this.logger.log(
      `Successfully created stock opname with code ${result.code}`,
    );
    return result;
  }

  async findAll(query: StockOpnamesListDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    const where: Prisma.stock_opnamesWhereInput = { store_id };
    const orderBy = this.buildOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.stock_opnames.findMany({
        where,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy,
        include: StockOpnamesService.stockOpnameListInclude,
      }),
      this.prisma.stock_opnames.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  async findOne(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    const user = requireUser(header);

    // Preview: new
    if (id === 'new') {
      const soCode = await this.generateNextSoCode(this.prisma);

      const masterItems = await this.prisma.master_inventory_items.findMany({
        where: {
          store_id: store_id,
        },
        select: { id: true, name: true, sku: true, stock_quantity: true },
      });

      const stockOpnameItems = masterItems.map((item) => ({
        expected_quantity: item.stock_quantity,
        actual_quantity: 0,
        diff_quantity: 0 - item.stock_quantity, // Keep this calculation since it's just for preview
        master_inventory_item_id: item.id,
        master_inventory_items: {
          id: item.id,
          name: item.name,
          sku: item.sku,
        },
      }));

      return {
        code: soCode,
        performedBy: user.id,
        createdAt: new Date(),
        users: { fullname: user.fullname },
        stockOpnameItems,
      };
    }

    const stockOpname = await this.prisma.stock_opnames.findUnique({
      where: { id, store_id },
      include: {
        stock_opname_items: {
          include: {
            master_inventory_items: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        users: { select: { fullname: true } },
      },
    });

    if (!stockOpname) throw new NotFoundException('Stock opname not found');
    return stockOpname;
  }

  async update(
    id: string,
    dto: UpdateStockOpnameDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Updating stock opname ${id} for store ${store_id}`);

    const itemsPayload = dto.items ?? [];
    if (!itemsPayload.length)
      throw new BadRequestException('items is required');
    const itemIds = itemsPayload.map((i) => i.masterInventoryItemId);

    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure SO belongs to store and is mutable
      const existing = await this.ensureSOInStore(tx, id, store_id, {
        id: true,
        status: true,
      });
      this.assertMutable(existing.status, 'update');

      // Validate inventory
      const invById = await this.validateInventoryItems(tx, store_id, itemIds);

      // Sync items: delete removed, upsert existing/new
      const existingItems = await tx.stock_opname_items.findMany({
        where: { stock_opname_id: id },
        select: { master_inventory_item_id: true },
      });

      const payloadIds = new Set(
        itemsPayload.map((i) => i.masterInventoryItemId),
      );
      const toDelete = existingItems
        .filter((it) => !payloadIds.has(it.master_inventory_item_id))
        .map((it) => it.master_inventory_item_id);

      if (toDelete.length) {
        await tx.stock_opname_items.deleteMany({
          where: {
            stock_opname_id: id,
            master_inventory_item_id: { in: toDelete },
          },
        });
      }

      // Upsert remaining/new items
      await Promise.all(
        itemsPayload.map(({ masterInventoryItemId, actualQuantity, notes }) => {
          const inv = invById.get(masterInventoryItemId)!;
          return tx.stock_opname_items.upsert({
            where: {
              stock_opname_id_master_inventory_item_id: {
                stock_opname_id: id,
                master_inventory_item_id: masterInventoryItemId,
              },
            },
            create: {
              stock_opname_id: id,
              master_inventory_item_id: masterInventoryItemId,
              expected_quantity: inv.stock_quantity,
              actual_quantity: actualQuantity,
              diff_quantity: actualQuantity - inv.stock_quantity,
              notes: notes ?? null,
            },
            update: {
              expected_quantity: inv.stock_quantity,
              actual_quantity: actualQuantity,
              diff_quantity: actualQuantity - inv.stock_quantity,
              notes: notes ?? null,
              updated_at: new Date(),
            },
          });
        }),
      );

      // Calculate new totals after item updates
      const totals = await this.calculateStockOpnameTotals(tx, id);

      // Update status and totals
      return tx.stock_opnames.update({
        where: { id },
        data: {
          status: dto.publishNow
            ? stock_opname_status.on_review
            : stock_opname_status.draft,
          total_item_checked: totals.total_item_checked,
          stock_mismatches: totals.stock_mismatches,
          updated_at: new Date(),
        },
        include: StockOpnamesService.stockOpnameInclude,
      });
    });

    this.logger.log(`Successfully updated stock opname ${id}`);
    return result;
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Removing stock opname ${id} from store ${store_id}`);

    return this.prisma.$transaction(async (tx) => {
      const existing = await this.ensureSOInStore(tx, id, store_id, {
        id: true,
        status: true,
      });
      this.assertMutable(existing.status, 'delete');

      // Delete all items
      await tx.stock_opname_items.deleteMany({
        where: { stock_opname_id: id },
      });

      // When deleting the stock opname, no need to update totals since the whole record will be deleted
      const result = await tx.stock_opnames.delete({ where: { id } });
      this.logger.log(`Successfully removed stock opname ${id}`);
      return result;
    });
  }

  async verify(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Verifying stock opname ${id} for store ${store_id}`);

    // Ensure exists + mutable for verification rule
    const existing = await this.ensureSOInStore(this.prisma, id, store_id, {
      id: true,
      status: true,
    });
    this.assertMutable(existing.status, 'verify');

    const result = await this.prisma.stock_opnames.update({
      where: { id },
      data: {
        status: stock_opname_status.verified,
        verified_at: new Date(),
        updated_at: new Date(),
      },
    });
    this.logger.log(`Successfully verified stock opname ${id}`);
    return result;
  }
}
