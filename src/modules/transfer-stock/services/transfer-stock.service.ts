import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  camelToSnake,
  toCamelCase,
} from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { requireStoreId } from 'src/common/helpers/common.helpers';
import { TransferStockListDto } from '../dtos/transfer-stock-list.dto';
import { CreateTransferStockDto } from '../dtos/create-transfer-stock.dto';
import { ItemListDto } from '../dtos/item-list.dto';

@Injectable()
export class TransferStockService {
  private readonly logger = new Logger(TransferStockService.name);

  constructor(private prisma: PrismaService) {}

  async findAllTransferStock(
    dto: TransferStockListDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    const orderByField = camelToSnake(dto.orderBy);
    const orderDirection = dto.orderDirection;

    const filters: Prisma.transfer_stocksWhereInput = {
      store_from_id: store_id,
    };
    const orderBy: Prisma.transfer_stocksOrderByWithRelationInput[] = [
      {
        [orderByField]: orderDirection,
      },
    ];

    const [items, total] = await Promise.all([
      this.prisma.transfer_stocks.findMany({
        where: filters,
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy: orderBy,
        include: {
          requested_user: {
            select: { id: true, fullname: true, email: true },
          },
          approved_user: {
            select: { id: true, fullname: true, email: true },
          },
          shipped_user: {
            select: { id: true, fullname: true, email: true },
          },
          received_user: {
            select: { id: true, fullname: true, email: true },
          },
          canceled_user: {
            select: { id: true, fullname: true, email: true },
          },
          rejected_user: {
            select: { id: true, fullname: true, email: true },
          },
        },
      }),
      this.prisma.transfer_stocks.count({ where: filters }),
    ]);

    return {
      items: items.map(toCamelCase),
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  async findAllRequestStock(
    dto: TransferStockListDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    const orderByField = camelToSnake(dto.orderBy);
    const orderDirection = dto.orderDirection;

    const filters: Prisma.transfer_stocksWhereInput = {
      store_to_id: 'b4905df4-ac1f-4257-a463-18c9c7482f9b',
    };
    const orderBy: Prisma.transfer_stocksOrderByWithRelationInput[] = [
      {
        [orderByField]: orderDirection,
      },
    ];

    const [items, total] = await Promise.all([
      this.prisma.transfer_stocks.findMany({
        where: filters,
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy: orderBy,
        include: {
          requested_user: {
            select: { id: true, fullname: true, email: true },
          },
          approved_user: {
            select: { id: true, fullname: true, email: true },
          },
          shipped_user: {
            select: { id: true, fullname: true, email: true },
          },
          received_user: {
            select: { id: true, fullname: true, email: true },
          },
          canceled_user: {
            select: { id: true, fullname: true, email: true },
          },
          rejected_user: {
            select: { id: true, fullname: true, email: true },
          },
        },
      }),
      this.prisma.transfer_stocks.count({ where: filters }),
    ]);

    return {
      items: items.map(toCamelCase),
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  async findAllItem(
    header: ICustomRequestHeaders,
    dto: ItemListDto,
    search?: string,
  ) {
    const store_from_id = requireStoreId(header);
    const { store_to_id } = dto;

    if (!store_to_id) {
      throw new BadRequestException('Destination store not found');
    }

    const sourceItems = await this.prisma.master_inventory_items.findMany({
      where: {
        store_id: store_from_id,
        AND: [{ sku: { not: null } }, { sku: { not: '' } }],
      },
      select: { sku: true },
    });

    const sourceSkus = sourceItems
      .map((item) => item.sku)
      .filter((sku): sku is string => !!sku);
    if (sourceSkus.length === 0) {
      return {
        items: [],
        meta: {
          page: dto.page,
          pageSize: dto.pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const orderByField = dto.orderBy ? camelToSnake(dto.orderBy) : 'created_at';
    const orderDirection: Prisma.SortOrder = dto.orderDirection ?? 'desc';
    const filters: Prisma.master_inventory_itemsWhereInput = {
      store_id: store_from_id,
      sku: { in: sourceSkus },
    };

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.master_inventory_items.findMany({
        where: filters,
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy: [{ [orderByField]: orderDirection }],
        select: {
          id: true,
          name: true,
          sku: true,
          stock_quantity: true,
        },
      }),
      this.prisma.master_inventory_items.count({ where: filters }),
    ]);

    return {
      items: items.map(toCamelCase),
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  async create(
    header: ICustomRequestHeaders,
    dto: CreateTransferStockDto,
    type: string,
  ) {
    const store_id = requireStoreId(header);
    const getOwnerId = await this.prisma.user_has_stores.findFirst({
      where: {
        store_id: store_id,
      },
      select: {
        user_id: true,
      },
    });

    if (!getOwnerId) {
      throw new BadRequestException('Store with ID ' + store_id + ' not found');
    }

    const storeFrom = await this.prisma.user_has_stores.findFirst({
      where: {
        user_id: getOwnerId?.user_id,
      },
    });

    if (!storeFrom) {
      throw new BadRequestException('Store From not found');
    }

    let isStockAvailable = false;
    for (const item of dto.items) {
      const getItem = await this.prisma.master_inventory_items.findFirst({
        where: {
          id: item.itemId,
          store_id: storeFrom?.store_id,
        },
      });

      if (getItem) {
        isStockAvailable = getItem.stock_quantity >= item.qty ? true : false;
        if (!isStockAvailable) {
          throw new BadRequestException(
            'Insufficient stock for item ' +
              getItem.name +
              ', remaining stock = ' +
              getItem.stock_quantity,
          );
        }
      } else {
        throw new BadRequestException(
          'Item with ID ' + item.itemId + ' not found',
        );
      }
    }

    const code = await this.generateTransactionCode();
    const result = await this.prisma.transfer_stocks.create({
      data: {
        transaction_code: code,
        store_from_id: storeFrom?.store_id,
        store_to_id: type == 'transfer' ? dto.store_to_id : store_id,
        note: dto.note,
        status: type == 'transfer' ? 'approved' : 'requested',
        requested_by: header.user.id,
        request_at: new Date(),
        approved_by: type == 'transfer' ? header.user.id : null,
        approved_at: type == 'transfer' ? new Date() : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    for (const item of dto.items) {
      const getItem = await this.prisma.master_inventory_items.findFirst({
        where: {
          id: item.itemId,
          store_id: storeFrom?.store_id,
        },
      });

      await this.prisma.transfer_stock_items.create({
        data: {
          transfer_stock_id: result.id,
          master_inventory_item_id: item.itemId,
          qty_requested: item.qty,
          qty_received: 0,
          unit_price: Number(getItem?.price_per_unit),
          subtotal: Number(getItem?.price_per_unit) * item.qty,
          status: 'pending',
          note: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    return result;
  }

  async generateTransactionCode(): Promise<string> {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');

    const countToday = await this.prisma.transfer_stocks.count({
      where: {
        created_at: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    const sequence = String(countToday + 1).padStart(4, '0');
    return `TS-${datePart}-${sequence}`;
  }
}
