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
import { UpdateTransferStockDto } from '../dtos/update-transfer-stock.dto';
import { UUID } from 'crypto';
import { ChangeStatusDto } from '../dtos/change-status.dto';
import { ChangeStatusReceiveDto } from '../dtos/change-status-received.dto';
import { TransferStockLossDto } from '../dtos/transfer-stock-loss.dto';

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

    let filters: Prisma.transfer_stocksWhereInput;

    if (dto.type === 'sender') {
      filters = { store_created_by: store_id };
    } else if (dto.type === 'receiver') {
      filters = {
        store_to_id: store_id,
        NOT: {
          status: { in: ['drafted', 'approved', 'canceled'] },
        },
      };
    } else {
      filters = {
        OR: [
          { store_created_by: store_id },
          {
            store_to_id: store_id,
            NOT: { status: { in: ['drafted', 'approved', 'canceled'] } },
          },
        ],
      };
    }

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
          store_from: true,
          store_to: true,
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
          transfer_stock_items: {
            include: {
              master_inventory_items: true,
            },
          },
        },
      }),
      this.prisma.transfer_stocks.count({ where: filters }),
    ]);

    const parsedItems = items.map((item) => ({
      ...toCamelCase(item),
      transferStockItems: item.transfer_stock_items.map((item) => ({
        ...toCamelCase(item),
        unitPrice: item.unit_price ? item.unit_price.toNumber() : 0,
        subtotal: item.subtotal ? item.subtotal.toNumber() : 0,
        masterInventoryItems: item.master_inventory_items
          ? {
              ...toCamelCase(item.master_inventory_items),
              pricePerUnit: item.master_inventory_items.price_per_unit
                ? item.master_inventory_items.price_per_unit.toNumber()
                : 0,
              priceGrosir: item.master_inventory_items.price_grosir
                ? item.master_inventory_items.price_grosir.toNumber()
                : 0,
            }
          : null,
      })),
    }));

    return {
      items: parsedItems,
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

  async create(header: ICustomRequestHeaders, dto: CreateTransferStockDto) {
    const store_id = requireStoreId(header);
    const allItemIds = dto.items.map((i) => i.itemId);
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: {
        id: { in: allItemIds },
        store_id: store_id,
      },
    });
    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

    for (const item of dto.items) {
      const found = itemMap.get(item.itemId);

      if (!found)
        throw new BadRequestException(`Item with ID ${item.itemId} not found`);

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
          store_from_id: store_id,
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
        const hasProduct = await this.prisma.master_inventory_items.findFirst({
          where: {
            store_id: dto.store_to_id,
            sku: inventory?.sku,
          },
        });

        await tx.transfer_stock_items.create({
          data: {
            transfer_stock_id: transfer.id,
            master_inventory_item_id: item.itemId,
            has_destination_product: hasProduct ? true : false,
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
      where: { id: id },
      include: {
        store_from: true,
        store_to: true,
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
        transfer_stock_items: {
          include: {
            master_inventory_items: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Transfer Stock not found');
    }

    const parsed = {
      ...toCamelCase(result),
      transferStockItems: result.transfer_stock_items.map((item) => ({
        ...toCamelCase(item),
        unitPrice: item.unit_price ? item.unit_price.toNumber() : 0,
        subtotal: item.subtotal ? item.subtotal.toNumber() : 0,
        masterInventoryItems: item.master_inventory_items
          ? {
              ...toCamelCase(item.master_inventory_items),
              pricePerUnit: item.master_inventory_items.price_per_unit
                ? item.master_inventory_items.price_per_unit.toNumber()
                : 0,

              priceGrosir: item.master_inventory_items.price_grosir
                ? item.master_inventory_items.price_grosir.toNumber()
                : 0,
            }
          : null,
      })),
    };

    return parsed;
  }

  async update(
    transferStockId: UUID,
    header: ICustomRequestHeaders,
    dto: UpdateTransferStockDto,
  ) {
    const store_id = requireStoreId(header);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock)
      throw new BadRequestException('Transfer Stock not found');

    const isAuthorized =
      transferStock.store_created_by === store_id &&
      ((transferStock.store_from_id === store_id &&
        transferStock.status === 'drafted') ||
        (transferStock.store_to_id === store_id &&
          transferStock.status === 'approved'));

    if (!isAuthorized) {
      throw new BadRequestException(
        'You are not authorized to update this data.',
      );
    }

    const allItemIds = dto.items.map((i) => i.itemId);
    const inventoryItems = await this.prisma.master_inventory_items.findMany({
      where: {
        id: { in: allItemIds },
        store_id: store_id,
      },
    });
    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));

    for (const item of dto.items) {
      const found = itemMap.get(item.itemId);

      if (!found)
        throw new BadRequestException(`Item with ID ${item.itemId} not found`);

      if (found.stock_quantity < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for item ${found.name}, remaining stock = ${found.stock_quantity}`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.transfer_stocks.update({
        where: { id: transferStockId },
        data: { updated_at: new Date() },
      });

      await tx.transfer_stock_items.deleteMany({
        where: { transfer_stock_id: transferStock.id },
      });

      for (const item of dto.items) {
        const inventory = itemMap.get(item.itemId);
        const unitPrice = Number(inventory?.price_per_unit ?? 0);
        const subtotal = unitPrice * item.qty;
        const hasProduct = await this.prisma.master_inventory_items.findFirst({
          where: {
            store_id: dto.store_to_id,
            sku: inventory?.sku,
          },
        });

        await tx.transfer_stock_items.create({
          data: {
            transfer_stock_id: updatedTransfer.id,
            master_inventory_item_id: item.itemId,
            has_destination_product: hasProduct ? true : false,
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

  async changeStatus(
    req: ICustomRequestHeaders,
    transferStockId: UUID,
    body: ChangeStatusDto,
  ) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock)
      throw new BadRequestException('Transfer stock not found.');

    const status = body.status?.toLowerCase();
    let isAuthorized = false;

    if (status === 'approve') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        transferStock.status === 'drafted';
    } else if (status === 'cancel') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        (transferStock.status === 'drafted' ||
          transferStock.status === 'approved');
    } else if (status === 'ship') {
      isAuthorized =
        transferStock.store_created_by === store_id &&
        transferStock.status === 'approved';
    } else {
      throw new BadRequestException(
        'Invalid status value. Allowed values: approve, cancel, ship.',
      );
    }

    if (!isAuthorized) {
      throw new BadRequestException(
        `You are not authorized to update this transfer stock to status "${status}".`,
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

  async checkProduct(req: ICustomRequestHeaders, transferStockId: UUID) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: {
        transfer_stock_items: true,
      },
    });

    if (!transferStock) {
      throw new BadRequestException('Transfer stock not found.');
    }

    if (store_id !== transferStock.store_to_id) {
      throw new BadRequestException(
        'You are not authorized to check products for this destination store.',
      );
    }

    let createNew = false;
    for (const item of transferStock.transfer_stock_items) {
      if (!item.has_destination_product) {
        const getProduct = await this.prisma.master_inventory_items.findFirst({
          where: { id: item.master_inventory_item_id },
        });

        if (!getProduct) {
          throw new BadRequestException('Source product not found.');
        }

        const getProductDestination =
          await this.prisma.master_inventory_items.findFirst({
            where: {
              store_id: store_id,
              sku: getProduct.sku,
            },
          });

        if (!getProductDestination) {
          await this.prisma.master_inventory_items.create({
            data: {
              name: getProduct.name,
              brand_id: null,
              barcode: getProduct.barcode,
              sku: getProduct.sku,
              category_id: null,
              unit: getProduct.unit,
              notes: getProduct.notes,
              stock_quantity: 0,
              reorder_level: getProduct.reorder_level,
              minimum_stock_quantity: getProduct.minimum_stock_quantity,
              expiry_date: getProduct.expiry_date,
              storage_location_id: null,
              price_per_unit: getProduct.price_per_unit,
              supplier_id: undefined,
              store_id: store_id,
              price_grosir: getProduct.price_grosir,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          createNew = true;
        }
      }
    }

    if (createNew) {
      return {
        statusCode: 200,
        message:
          'Some products were not found in the destination store and have been created automatically.',
      };
    }

    return {
      statusCode: 200,
      message: 'All products exist in destination store.',
    };
  }

  async approve(
    userId: number,
    transferStockId: UUID,
    tx: Prisma.TransactionClient,
  ) {
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

  async cancel(
    userId: number,
    transferStockId: UUID,
    data: ChangeStatusDto,
    tx: Prisma.TransactionClient,
  ) {
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

  async ship(
    userId: number,
    transferStockId: UUID,
    data: ChangeStatusDto,
    tx: Prisma.TransactionClient,
  ) {
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
        data: { stock_quantity: masterItem.stock_quantity - item.qty_reserved },
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
        status: 'shipped',
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

  async receiveStock(
    req: ICustomRequestHeaders,
    transferStockId: UUID,
    body: ChangeStatusReceiveDto,
  ) {
    const store_id = requireStoreId(req);
    const transferStock = await this.prisma.transfer_stocks.findFirst({
      where: { id: transferStockId },
      include: { transfer_stock_items: true },
    });

    if (!transferStock)
      throw new BadRequestException('Transfer stock not found.');

    const status = body.status?.toLowerCase();
    let isAuthorized = false;

    if (status === 'received' || status === 'received_with_issue') {
      isAuthorized =
        transferStock.store_to_id === store_id &&
        transferStock.status === 'shipped';
    } else {
      throw new BadRequestException(
        'Invalid status value. Allowed values: approve, cancel, ship.',
      );
    }

    if (!isAuthorized) {
      throw new BadRequestException(
        `You are not authorized to update this transfer stock to status "${status}".`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return await this.received(req.user.id, transferStockId, body, tx);
    });

    return result;
  }

  async received(
    userId: number,
    transferStockId: UUID,
    data: ChangeStatusReceiveDto,
    tx: Prisma.TransactionClient,
  ) {
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

    const validItemIds = transferStock.transfer_stock_items.map(
      (item) => item.master_inventory_item_id,
    );
    const invalidItemIds = data.items.filter(
      (x) => !validItemIds.includes(x.itemId),
    );

    if (invalidItemIds.length > 0) {
      throw new BadRequestException(
        `Invalid itemId(s) detected: ${invalidItemIds
          .map((x) => x.itemId)
          .join(', ')}`,
      );
    }

    for (const receivedItem of data.items) {
      const stockItem = transferStock.transfer_stock_items.find(
        (x) => x.master_inventory_item_id === receivedItem.itemId,
      );
      const masterItem = stockItem?.master_inventory_items;

      if (!stockItem || !masterItem) {
        throw new BadRequestException(
          `Item with ID ${receivedItem.itemId} not found or invalid.`,
        );
      }

      const destinationItem = await tx.master_inventory_items.findFirst({
        where: {
          store_id: transferStock.store_to_id,
          sku: masterItem.sku,
        },
      });

      if (!destinationItem) {
        throw new BadRequestException(
          `Destination item not found for SKU ${masterItem.sku}`,
        );
      }

      await tx.master_inventory_items.update({
        where: { id: destinationItem.id },
        data: {
          stock_quantity:
            destinationItem.stock_quantity + receivedItem.qty_received,
        },
      });

      await tx.transfer_stock_items.update({
        where: { id: stockItem.id },
        data: {
          status:
            data.status === 'received' ? 'received' : 'received_with_issue',
          note: receivedItem.notes ?? null,
        },
      });
    }

    await tx.transfer_stocks.update({
      where: { id: transferStockId },
      data: {
        received_by: userId,
        received_at: new Date(),
        status: data.status === 'received' ? 'received' : 'received_with_issue',
      },
    });

    if (data.status === 'received_with_issue') {
      for (const receivedItem of data.items) {
        const stockItem = transferStock.transfer_stock_items.find(
          (x) => x.master_inventory_item_id === receivedItem.itemId,
        );
        if (!stockItem) continue;

        const difference = receivedItem.qty_shipped - receivedItem.qty_received;
        if (difference > 0) {
          const unitPrice = Number(
            stockItem.master_inventory_items?.price_per_unit ?? 0,
          );
          const lossAmount = difference * unitPrice;

          await tx.transfer_stock_losses.create({
            data: {
              store_id:
                transferStock.store_created_by || transferStock.store_from_id,
              transfer_stock_id: transferStock.id,
              transfer_stock_item_id: stockItem.id,
              qty_lost: difference,
              unit_price: unitPrice,
              loss_amount: lossAmount,
            },
          });
        }
      }
    }

    return {
      statusCode: 200,
      message:
        data.status === 'received'
          ? 'Transfer stock received successfully.'
          : 'Transfer stock received with issues successfully.',
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
      transferStock.store_created_by === store_id &&
      ((transferStock.store_from_id === store_id &&
        transferStock.status === 'drafted') ||
        (transferStock.store_to_id === store_id &&
          transferStock.status === 'approved'));

    if (!isAuthorized) {
      throw new BadRequestException(
        'You are not authorized to delete this data.',
      );
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
        message: 'Transfer stock deleted successfully and stock restored.',
      };
    });

    return result;
  }

  async findAllTransferStockLoss(
    dto: TransferStockLossDto,
    header: ICustomRequestHeaders,
  ) {
    const storeId = requireStoreId(header);
    const orderByField = camelToSnake(dto.orderBy || 'created_at');
    const orderDirection = dto.orderDirection || 'desc';

    const filters: Prisma.transfer_stock_lossesWhereInput = {
      store_id: storeId,
    };

    const orderBy: Prisma.transfer_stock_lossesOrderByWithRelationInput[] = [
      {
        [orderByField]: orderDirection,
      },
    ];

    const [items, total] = await Promise.all([
      this.prisma.transfer_stock_losses.findMany({
        where: filters,
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy,
        include: {
          transfer_stock: true,
          transfer_stock_item: true,
        },
      }),
      this.prisma.transfer_stock_losses.count({ where: filters }),
    ]);

    const parsedItems = items.map((loss) => ({
      ...toCamelCase(loss),
      unitPrice: loss.unit_price ? loss.unit_price.toNumber() : 0,
      lossAmount: loss.loss_amount ? loss.loss_amount.toNumber() : 0,
      transferStockItem: loss.transfer_stock_item
        ? {
            ...toCamelCase(loss.transfer_stock_item),
            unitPrice: loss.transfer_stock_item.unit_price
              ? loss.transfer_stock_item.unit_price.toNumber()
              : 0,
            subtotal: loss.transfer_stock_item.subtotal
              ? loss.transfer_stock_item.subtotal.toNumber()
              : 0,
          }
        : null,
    }));

    return {
      items: parsedItems,
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  async getLoss(id: UUID) {
    const result = await this.prisma.transfer_stock_losses.findFirst({
      where: { id },
      include: {
        transfer_stock: true,
        transfer_stock_item: true,
      },
    });

    if (!result) {
      throw new NotFoundException('Transfer Stock Loss not found');
    }

    const parsed = {
      ...toCamelCase(result),
      unitPrice: result.unit_price ? result.unit_price.toNumber() : 0,
      lossAmount: result.loss_amount ? result.loss_amount.toNumber() : 0,
      transferStockItem: result.transfer_stock_item
        ? {
            ...toCamelCase(result.transfer_stock_item),
            unitPrice: result.transfer_stock_item.unit_price
              ? result.transfer_stock_item.unit_price.toNumber()
              : 0,
            subtotal: result.transfer_stock_item.subtotal
              ? result.transfer_stock_item.subtotal.toNumber()
              : 0,
          }
        : null,
    };

    return parsed;
  }
}
