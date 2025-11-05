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
import { ShipTransferStockDto } from '../dtos/ship-transfer-stock.dto';
import { ChangeStatusDto } from '../dtos/change-status-dto';

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
          drafted_user: {
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

  async create(
    header: ICustomRequestHeaders,
    dto: CreateTransferStockDto
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
          store_to_id: dto.store_to_id,
          store_created_by: store_id,
          transaction_code: code,
          note: dto.note,
          status: 'drafted',
          drafted_by: header.user.id,
          drafted_at: new Date(),
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
            qty_reserved: item.qty,
            qty_received: 0,
            unit_price: unitPrice,
            subtotal,
            status: 'pending',
            note: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      return transfer;
    });

    return result;
  }

  async get(id: UUID) {
    const result = await this.prisma.transfer_stocks.findFirst({
      where: {id: id},
      include: {
        drafted_user: {
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
      }
    });

     if (!result) {
      throw new NotFoundException('Transfer Stock not found');
    }

    return result;
  }

  async update(
    header: ICustomRequestHeaders,
    dto: UpdateTransferStockDto
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
        (transferStock.store_from_id === store_id && transferStock.status === 'drafted') ||
        (transferStock.store_to_id === store_id && transferStock.status === 'approved')
      )

    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to update this data.');
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
            qty_reserved: item.qty,
            qty_received: 0,
            unit_price: unitPrice,
            subtotal,
            status: 'pending',
            note: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      return updatedTransfer;
    });

    return result;
  }

  async changeStatus(req: ICustomRequestHeaders, transferStockId: UUID, body: ChangeStatusDto) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock) throw new BadRequestException('Transfer stock not found.');

    const status = body.status?.toLowerCase();
    let isAuthorized = false;

    if (status === 'approve') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        transferStock.status === 'drafted';
    } else if (status === 'cancel') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        (transferStock.status === 'drafted' || transferStock.status === 'approved');
    } else if (status === 'ship') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        transferStock.status === 'approved';
    } else {
      throw new BadRequestException('Invalid status value. Allowed values: approve, cancel, ship.');
    }

    if (!isAuthorized) {
      throw new BadRequestException(
        `You are not authorized to update this transfer stock to status "${status}".`
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (status === 'approve') {
        return await this.approve(req.user.id, transferStockId, tx);
      }

      if (status === 'cancel') {
        return await this.cancel(req.user.id, transferStockId, body, tx);
      }

      if (status === 'ship') {
        return await this.ship(req.user.id, transferStockId, body, tx);
      }

      return {
        statusCode: 200,
        message: 'Transfer stock status updated successfully.',
      };
    });

    return result;
  }

  async approve(userId: number, transferStockId: UUID, tx: Prisma.TransactionClient) {
    const transferStock = await tx.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: {
        transfer_stock_items: {
          include: { master_inventory_items: true },
        },
      },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer stock not found.');
    }

    for (const item of transferStock.transfer_stock_items) {
      const found = item.master_inventory_items;

      if (!found) {
        throw new BadRequestException('Master inventory item not found.');
      }

      if (found.stock_quantity < item.qty_reserved) {
        throw new BadRequestException(
          `Insufficient stock for item ${found.name}, remaining stock = ${found.stock_quantity}`,
        );
      }
    }
    
    await tx.transfer_stocks.update({
      where: { id: transferStockId },
      data: {
        approved_by: userId,
        approved_at: new Date(),
        status: 'approved',
      },
    });

    await tx.transfer_stock_items.updateMany({
      where: { transfer_stock_id: transferStockId },
      data: { status: 'on_progress' },
    });

    return {
      statusCode: 200,
      message: 'Transfer stock approved successfully.',
    };
  }

  async cancel(userId: number, transferStockId: UUID, data: ChangeStatusDto, tx: Prisma.TransactionClient) {
    const transferStock = await tx.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: {
        transfer_stock_items: {
          include: { master_inventory_items: true },
        },
      },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer stock not found.');
    }

    for (const item of transferStock.transfer_stock_items) {
      const masterItem = item.master_inventory_items;

      if (!masterItem) {
        throw new BadRequestException('Master inventory item not found.');
      }

      await tx.transfer_stock_items.updateMany({
        where: {
          transfer_stock_id: transferStock.id,
          master_inventory_item_id: item.master_inventory_item_id,
        },
        data: { status: 'canceled' },
      });
    }

    await tx.transfer_stocks.update({
      where: { id: transferStockId },
      data: {
        canceled_by: userId,
        canceled_at: new Date(),
        canceled_note: data.note,
        status: 'canceled',
      },
    });

    return {
      statusCode: 200,
      message: 'Transfer stock canceled successfully.',
    };
  }

  async ship(userId: number, transferStockId: UUID, data: ChangeStatusDto, tx: Prisma.TransactionClient) {
    const transferStock = await tx.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: {
        transfer_stock_items: {
          include: { master_inventory_items: true },
        },
      },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer stock not found.');
    }

    for (const item of transferStock.transfer_stock_items) {
      const masterItem = item.master_inventory_items;

      if (!masterItem) {
        throw new BadRequestException('Master inventory item not found.');
      }

      if (masterItem.stock_quantity < item.qty_reserved) {
        throw new BadRequestException(
          `Insufficient stock for item ${masterItem.name}, remaining stock = ${masterItem.stock_quantity}`,
        );
      }

      await tx.master_inventory_items.update({
        where: { id: masterItem.id },
        data: { stock_quantity: masterItem.stock_quantity - item.qty_reserved }
      });
    }
    
    await tx.transfer_stocks.update({
      where: { id: transferStockId },
      data: {
        shipped_by: userId,
        shipped_at: new Date(),
        logistic_provider: data.logistic_provider,
        tracking_number: data.tracking_number,
        delivery_note: data.delivery_note,
        status: 'shipped'
      },
    });

    await tx.transfer_stock_items.updateMany({
      where: { transfer_stock_id: transferStockId },
      data: { status: 'shipped' },
    });

    return {
      statusCode: 200,
      message: 'Transfer stock shipped successfully.',
    };
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
        (transferStock.store_from_id === store_id && transferStock.status === 'drafted') ||
        (transferStock.store_to_id === store_id && transferStock.status === 'approved')
      )

    if (!isAuthorized) {
      throw new BadRequestException('You are not authorized to delete this data.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
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

  async findAllReceiverStock(
    dto: TransferStockListDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    const orderByField = camelToSnake(dto.orderBy);
    const orderDirection = dto.orderDirection;

    const filters: Prisma.transfer_stocksWhereInput = {
      store_to_id: store_id,
      status: {
        in: ['shipped', 'received', 'received_with_issue'],
      },
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
          drafted_user: {
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
}
