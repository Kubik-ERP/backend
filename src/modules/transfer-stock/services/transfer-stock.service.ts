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
import { UpdateTransferStockDto } from '../dtos/update-transfer-stock.dto';
import { UUID } from 'crypto';

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
      store_from_id: store_id
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

  async create(
    header: ICustomRequestHeaders,
    dto: CreateTransferStockDto,
    type: 'request' | 'transfer',
  ) {
    const store_id = requireStoreId(header);
    const storeFrom = await this.getStoreFrom(store_id);

    const allItemIds = dto.items.map((i) => i.itemId);
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: {
        id: { in: allItemIds },
        store_id: storeFrom.store_id,
      },
    });
    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

    for (const item of dto.items) {
      const found = itemMap.get(item.itemId);

      if (!found) throw new BadRequestException(`Item with ID ${item.itemId} not found`);

      if (found.stock_quantity < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for item ${found.name}, remaining stock = ${found.stock_quantity}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const code = await this.generateTransactionCode();
      const transfer = await tx.transfer_stocks.create({
        data: {
          store_from_id: storeFrom.store_id,
          store_to_id: type === 'transfer' ? dto.store_to_id : store_id,
          store_created_by: store_id,
          transaction_code: code,
          note: dto.note,
          status: type === 'transfer' ? 'approved' : 'requested',
          requested_by: header.user.id,
          request_at: new Date(),
          approved_by: type === 'transfer' ? header.user.id : null,
          approved_at: type === 'transfer' ? new Date() : null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      for (const item of dto.items) {
        const inventory = itemMap.get(item.itemId);
        const unitPrice = Number(inventory?.price_per_unit ?? 0);
        const subtotal = unitPrice * item.qty;

        await tx.transfer_stock_items.create({
          data: {
            transfer_stock_id: transfer.id,
            master_inventory_item_id: item.itemId,
            qty_requested: item.qty,
            qty_received: 0,
            unit_price: unitPrice,
            subtotal,
            status: type === 'transfer' ? 'on_progress' : 'pending',
            note: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        if (transfer.status === 'approved' && type === 'transfer') {
          const newQty = Math.max((inventory?.stock_quantity ?? 0) - item.qty, 0);
          await tx.master_inventory_items.update({
            where: {
              id: item.itemId,
              store_id: storeFrom.store_id,
            },
            data: { stock_quantity: newQty },
          });
        }
      }

      return transfer;
    });

    return result;
  }

  async update(
    header: ICustomRequestHeaders,
    dto: UpdateTransferStockDto,
    type: 'request' | 'transfer',
  ) {
    const store_id = requireStoreId(header);
    const storeFrom = await this.getStoreFrom(store_id);

    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: dto.transfer_stock_id },
      include: { transfer_stock_items: true },
    });

    if (!transferStock) throw new BadRequestException('Transfer Stock not found');

    const isAuthorized =
      transferStock.store_created_by === store_id && (
        (transferStock.store_from_id === store_id && transferStock.status === 'approved') ||
        (transferStock.store_to_id === store_id && transferStock.status === 'requested')
      )

    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to cancel this data.');
    }

    const allItemIds = dto.items.map((i) => i.itemId);
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: {
        id: { in: allItemIds },
        store_id: storeFrom.store_id,
      },
    });
    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

    for (const item of dto.items) {
      const found = itemMap.get(item.itemId);

      if (!found) throw new BadRequestException(`Item with ID ${item.itemId} not found`);

      if (found.stock_quantity < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for item ${found.name}, remaining stock = ${found.stock_quantity}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.transfer_stocks.update({
        where: { id: dto.transfer_stock_id },
        data: { updated_at: new Date() },
      });

      for (const product of transferStock.transfer_stock_items) {
        const getProduct = await tx.master_inventory_items.findFirst({
          where: { id: product.master_inventory_item_id },
        });

        if (getProduct) {
          await tx.master_inventory_items.update({
            where: { id: getProduct.id },
            data: {
              stock_quantity: (getProduct.stock_quantity ?? 0) + (product.qty_requested ?? 0),
            },
          });
        }
      }

      await tx.transfer_stock_items.deleteMany({
        where: { transfer_stock_id: transferStock.id },
      });

      for (const item of dto.items) {
        const inventory = itemMap.get(item.itemId);
        const unitPrice = Number(inventory?.price_per_unit ?? 0);
        const subtotal = unitPrice * item.qty;

        await tx.transfer_stock_items.create({
          data: {
            transfer_stock_id: updatedTransfer.id,
            master_inventory_item_id: item.itemId,
            qty_requested: item.qty,
            qty_received: 0,
            unit_price: unitPrice,
            subtotal,
            status: type === 'transfer' ? 'on_progress' : 'pending',
            note: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        if (updatedTransfer.status === 'approved' && type === 'transfer') {
          const latest = await tx.master_inventory_items.findUnique({
            where: {
              id: item.itemId,
              store_id: storeFrom.store_id,
            },
            select: { stock_quantity: true },
          });

          const currentStock = latest?.stock_quantity ?? 0;

          await tx.master_inventory_items.update({
            where: {
              id: item.itemId,
              store_id: storeFrom.store_id,
            },
            data: {
              stock_quantity: currentStock - item.qty,
            },
          });
        }
      }

      return updatedTransfer;
    });

    return result;
  }

  async delete(req: ICustomRequestHeaders, transferStockId: UUID) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer Stock not found');
    }

    const isAuthorized =
      transferStock.store_created_by === store_id && (
        (transferStock.store_from_id === store_id && transferStock.status === 'approved') ||
        (transferStock.store_to_id === store_id && transferStock.status === 'requested')
      )

    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to cancel this data.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of transferStock.transfer_stock_items) {
        const product = await tx.master_inventory_items.findFirst({
          where: { id: item.master_inventory_item_id },
        });

        if (product) {
          await tx.master_inventory_items.update({
            where: { id: product.id },
            data: {
              stock_quantity: (product.stock_quantity ?? 0) + (item.qty_requested ?? 0),
            },
          });
        }
      }

      await tx.transfer_stock_items.deleteMany({
        where: { transfer_stock_id: transferStock.id },
      });

      await tx.transfer_stocks.delete({
        where: { id: transferStock.id },
      });

      return {
        statusCode: 200,
        message: 'Transfer stock deleted successfully and stock restored.'
      };
    });

    return result;
  }

  async cancel(req: ICustomRequestHeaders, transferStockId: UUID, note: string) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer Stock not found');
    }

    if (transferStock.status !== 'requested' && transferStock.status !== 'approved') {
      throw new BadRequestException('Cannot change the status to canceled because the current status is already ' + transferStock.status);
    }

    const isAuthorized =
      transferStock.store_created_by === store_id && (
        (transferStock.store_from_id === store_id && transferStock.status === 'approved') ||
        (transferStock.store_to_id === store_id && transferStock.status === 'requested')
      )

    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to cancel this data.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of transferStock.transfer_stock_items) {
        const product = await tx.master_inventory_items.findFirst({
          where: { id: item.master_inventory_item_id },
        });

        if (product) {
          await tx.master_inventory_items.update({
            where: { id: product.id },
            data: {
              stock_quantity: (product.stock_quantity ?? 0) + (item.qty_requested ?? 0),
            },
          });

          await tx.transfer_stock_items.updateMany({
            where: { transfer_stock_id: transferStock.id, master_inventory_item_id: product.id },
            data: {status: 'canceled'}
          });
        }
      }

      await tx.transfer_stocks.update({
        where: { id: transferStockId },
        data: {
          canceled_by: req.user.id,
          canceled_at: new Date(),
          canceled_note: note,
          status: 'canceled'
        }
      });

      return {
        statusCode: 200,
        message: 'Transfer stock canceled successfully and stock restored.'
      };
    });

    return result;
  }

  async reject(req: ICustomRequestHeaders, transferStockId: UUID, note: string) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer Stock not found');
    }

    if (transferStock.status !== 'requested' && transferStock.status !== 'approved') {
      throw new BadRequestException('Cannot change the status to rejected because the current status is already ' + transferStock.status);
    }

    const isAuthorized = transferStock.store_created_by === store_id && (transferStock.store_to_id === store_id && transferStock.status === 'requested');
    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to reject this data.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of transferStock.transfer_stock_items) {
        const product = await tx.master_inventory_items.findFirst({
          where: { id: item.master_inventory_item_id },
        });

        if (product) {
          await tx.master_inventory_items.update({
            where: { id: product.id },
            data: {
              stock_quantity: (product.stock_quantity ?? 0) + (item.qty_requested ?? 0),
            },
          });

          await tx.transfer_stock_items.updateMany({
            where: { transfer_stock_id: transferStock.id, master_inventory_item_id: product.id },
            data: {status: 'rejected'}
          });
        }
      }

      await tx.transfer_stocks.update({
        where: { id: transferStockId },
        data: {
          rejected_by: req.user.id,
          rejected_at: new Date,
          rejected_note: note,
          status: 'rejected', 
          note: note
        }
      });

      return {
        statusCode: 200,
        message: 'Transfer stock rejected successfully and stock restored.'
      };
    });

    return result;
  }

  async getStoreFrom(store_id: string) {
    const getOwnerId = await this.prisma.user_has_stores.findFirst({
      where: { store_id },
      select: { user_id: true },
    });

    if (!getOwnerId) throw new BadRequestException(`Store with ID ${store_id} not found`);

    const storeFrom = await this.prisma.user_has_stores.findFirst({
      where: { user_id: getOwnerId.user_id },
    });

    if (!storeFrom) throw new BadRequestException('Store From not found');

    return storeFrom;
  }
}
