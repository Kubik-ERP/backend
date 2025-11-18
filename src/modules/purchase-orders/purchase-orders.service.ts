import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { UpdatePurchaseOrdersDto } from './dto/update-purchase-orders.dto';
import { PurchaseOrdersListDto } from './dto/purchase-orders-list.dto';
import {
  Prisma,
  purchase_order_status,
  stock_adjustment_action,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { camelToSnake } from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import {
  generateNextId,
  requireStoreId,
} from 'src/common/helpers/common.helpers';
import { idToNumber } from 'src/common/helpers/common.helpers';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: PurchaseOrdersListDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    // --- Filter
    const filters: Prisma.purchase_ordersWhereInput = {
      store_id,
    };

    // --- Search
    if (query.search) {
      filters.OR = [
        { order_number: { contains: query.search, mode: 'insensitive' } },
        {
          master_suppliers: {
            supplier_name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }
    // --- End Filter

    // --- Order by
    // orderNumber, supplierName, orderDate, deliveryDate, orderStatus, totalPrice
    const orderByField = camelToSnake(query.orderBy);
    const orderDirection = query.orderDirection;
    const orderBy: Prisma.purchase_ordersOrderByWithRelationInput[] = [];
    if (orderByField === 'supplier_name') {
      orderBy.push({
        // NOTE: harusnya ke supplier_info->>supplier_name
        // prisma belum support order by dengan type json
        // https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#can-you-sort-an-object-property-within-a-json-value
        master_suppliers: {
          supplier_name: orderDirection,
        },
      });
    } else {
      orderBy.push({ [orderByField]: orderDirection });
    }

    // --- Fetch data
    const [items, total] = await Promise.all([
      this._prisma.purchase_orders.findMany({
        where: filters,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: orderBy,
      }),
      this._prisma.purchase_orders.count({
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
    const store_id = requireStoreId(header);

    const purchaseOrderRaw = await this._prisma.purchase_orders.findUnique({
      where: { id, store_id },
      include: {
        purchase_order_items: true,
        users: {
          select: {
            id: true,
            fullname: true,
          },
        },
        users_purchase_orders_cancelled_byTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
        users_purchase_orders_confirmed_byTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
        users_purchase_orders_created_byTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
        users_purchase_orders_paid_byTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
        users_purchase_orders_shipped_byTousers: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
    });

    // ✅ Cek dulu apakah datanya ada
    if (!purchaseOrderRaw) {
      throw new NotFoundException('Purchase order not found');
    }

    // ✅ Rename users -> receiver
    const {
      users: receiver,
      users_purchase_orders_cancelled_byTousers: cancelled,
      users_purchase_orders_confirmed_byTousers: confirmed,
      users_purchase_orders_created_byTousers: created,
      users_purchase_orders_paid_byTousers: paid,
      users_purchase_orders_shipped_byTousers: shipped,
      ...purchaseOrder
    } = purchaseOrderRaw;

    // ✅ Return hasil dengan alias receiver
    return {
      ...purchaseOrder,
      receiver,
      cancelled,
      confirmed,
      created,
      paid,
      shipped,
    };
  }

  async create(dto: CreatePurchaseOrdersDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Creating new purchase order for store ${store_id}`);

    const { productItems } = dto;
    if (!productItems?.length) {
      throw new BadRequestException('productItems is required');
    }

    // akan di assign otomatis ke user yang login
    const userId = header.user.id;

    // Validasi Supplier
    const supplier = await this._prisma.master_suppliers.findFirst({
      where: {
        id: dto.supplierId,
        store_id: store_id,
      },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    // --- Fetch + validate items belong to this store
    const itemIds = productItems.map((i) => i.masterItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        store_id: store_id,
      },
      include: { master_brands: { select: { brand_name: true } } },
    });

    const invById = new Map(inventoryItems.map((it) => [it.id, it]));
    const missingIds = itemIds.filter((id) => !invById.has(id));
    if (missingIds.length) {
      throw new BadRequestException(
        `Some products do not exist or do not belong to this store: ${missingIds.join(', ')}`,
      );
    }

    if (inventoryItems.length !== productItems.length) {
      throw new BadRequestException('Some products do not exist');
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // Generate next PO number
      const lastPO = await tx.purchase_orders.findFirst({
        orderBy: { created_at: 'desc' },
        select: { order_number: true },
      });

      const poNumber = generateNextId(
        'PO',
        lastPO?.order_number ? idToNumber(lastPO.order_number) : 0,
      );

      // Prepare PO items & total
      let totalPrice = 0;
      const purchaseOrderItems = productItems.map(
        ({ masterItemId, quantity, expiredAt }) => {
          const inv = invById.get(masterItemId)!;
          const unitGrosir = Number(inv.price_grosir); // consider Decimal if you need exact money math
          const lineTotal = unitGrosir * quantity;
          totalPrice += lineTotal;

          return {
            master_inventory_item_id: masterItemId,
            quantity,
            unit_price: unitGrosir,
            total_price: lineTotal,
            actual_quantity: 0,
            diff_quantity: -quantity,
            expired_at: expiredAt,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
              barcode: inv.barcode,
            },
          };
        },
      );

      // Create PO + items
      const po = await tx.purchase_orders.create({
        data: {
          order_status: purchase_order_status.pending,
          order_number: poNumber,
          store_id,
          master_supplier_id: dto.supplierId,
          order_date: dto.orderDate,
          total_price: totalPrice,
          supplier_info: {
            supplier_name: supplier.supplier_name,
            contact_person: supplier.contact_person,
            phone_number: supplier.phone_number,
            address: supplier.address,
          },
          purchase_order_items: {
            createMany: { data: purchaseOrderItems },
          },
          created_by: userId,
        },
        include: { purchase_order_items: true },
      });

      return po;
    });

    this.logger.log(
      `Successfully created purchase order with number ${result.order_number}`,
    );
    return result;
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrdersDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Updating purchase order ${id} for store ${store_id}`);

    const { productItems } = dto;
    if (!productItems?.length) {
      throw new BadRequestException('productItems is required');
    }

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Validate supplier belongs to this store
    const supplier = await this._prisma.master_suppliers.findFirst({
      where: {
        id: dto.supplierId,
        store_id: store_id,
      },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    // Validate items belong to this store
    const itemIds = productItems.map((i) => i.masterItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        store_id: store_id,
      },
      include: { master_brands: { select: { brand_name: true } } },
    });
    const invById = new Map(inventoryItems.map((it) => [it.id, it]));
    const missingIds = itemIds.filter((id) => !invById.has(id));
    if (missingIds.length) {
      throw new BadRequestException(
        `Some products do not exist or do not belong to this store: ${missingIds.join(', ')}`,
      );
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // Current items on this PO
      const existingItems = await tx.purchase_order_items.findMany({
        where: { purchase_order_id: id },
        select: { id: true },
      });
      const existingIds = new Set(existingItems.map((i) => i.id));

      // Build create/update payloads + recompute total
      let totalPrice = 0;
      const itemsCreate: Array<{
        master_inventory_item_id: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        diff_quantity: number;
        actual_quantity: number;
        item_info: any;
        expired_at?: Date;
      }> = [];
      const itemsUpdate: Array<{
        id: string;
        master_inventory_item_id: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        diff_quantity: number;
        actual_quantity: number;
        item_info: any;
        expired_at?: Date;
      }> = [];

      for (const item of productItems) {
        const inv = invById.get(item.masterItemId)!;
        const unitGrosir = Number(inv.price_grosir);
        const lineTotal = unitGrosir * item.quantity;
        totalPrice += lineTotal;

        if (item.id) {
          // only allow update if this line actually belongs to this PO
          if (!existingIds.has(item.id)) {
            throw new BadRequestException(
              `Item id ${item.id} does not belong to this Purchase Order`,
            );
          }
          itemsUpdate.push({
            id: item.id,
            master_inventory_item_id: item.masterItemId,
            quantity: item.quantity,
            unit_price: unitGrosir,
            total_price: lineTotal,
            actual_quantity: 0,
            diff_quantity: -item.quantity,
            expired_at: item.expiredAt,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
              barcode: inv.barcode,
            },
          });
        } else {
          itemsCreate.push({
            master_inventory_item_id: item.masterItemId,
            quantity: item.quantity,
            unit_price: unitGrosir,
            total_price: lineTotal,
            actual_quantity: 0,
            diff_quantity: -item.quantity,
            expired_at: item.expiredAt,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
              barcode: inv.barcode,
            },
          });
        }
      }

      // Anything existing but not in incoming -> delete
      const incomingIds = new Set(
        productItems.filter((p) => p.id).map((p) => p.id as string),
      );
      const itemsDeleteIds = [...existingIds].filter(
        (eid) => !incomingIds.has(eid),
      );

      // 1) Update PO header
      await tx.purchase_orders.update({
        where: { id },
        data: {
          master_supplier_id: dto.supplierId,
          order_date: dto.orderDate,
          total_price: totalPrice,
          supplier_info: {
            supplier_name: supplier.supplier_name,
            contact_person: supplier.contact_person,
            phone_number: supplier.phone_number,
            address: supplier.address,
          },
        },
      });

      // 2) Delete removed lines
      if (itemsDeleteIds.length) {
        await tx.purchase_order_items.deleteMany({
          where: { id: { in: itemsDeleteIds }, purchase_order_id: id },
        });
      }

      // 3) Update existing lines
      if (itemsUpdate.length) {
        await Promise.all(
          itemsUpdate.map((u) =>
            tx.purchase_order_items.update({
              where: { id: u.id },
              data: {
                master_inventory_item_id: u.master_inventory_item_id,
                quantity: u.quantity,
                unit_price: u.unit_price,
                total_price: u.total_price,
                actual_quantity: 0,
                diff_quantity: -u.quantity,
                updated_at: new Date(),
                expired_at: u.expired_at,
              },
            }),
          ),
        );
      }

      // 4) Create new lines
      if (itemsCreate.length) {
        await tx.purchase_order_items.createMany({
          data: itemsCreate.map((c) => ({
            ...c,
            purchase_order_id: id,
          })),
        });
      }

      // Return the fresh PO with items
      return tx.purchase_orders.findUnique({
        where: { id },
        include: { purchase_order_items: true },
      });
    });

    this.logger.log(`Successfully updated purchase order ${id}`);
    return result;
  }

  async cancel(
    id: string,
    dto: CancelPurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Cancelling purchase order ${id} for store ${store_id}`);

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // akan di assign otomatis ke user yang login
    const userId = header.user.id;

    const disallowedStatuses = [
      purchase_order_status.cancelled,
      purchase_order_status.received,
    ] as purchase_order_status[];
    if (disallowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be cancelled',
      );
    }

    const cancelledPO = await this._prisma.purchase_orders.update({
      where: { id },
      data: {
        order_status: purchase_order_status.cancelled,
        cancel_reason: dto.reason,
        cancelled_at: new Date(),
        updated_at: new Date(),
        cancelled_by: userId,
      },
    });

    this.logger.log(`Successfully cancelled purchase order ${id}`);
    return cancelledPO;
  }

  async confirm(
    id: string,
    dto: ConfirmPurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Confirming purchase order ${id} for store ${store_id}`);

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // akan di assign otomatis ke user yang login
    const userId = header.user.id;

    // Check if PO status is allowed to confirm
    const disallowedStatuses = [
      purchase_order_status.confirmed,
      purchase_order_status.cancelled,
      purchase_order_status.received,
    ] as purchase_order_status[];
    if (disallowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be confirmed',
      );
    }

    // Generate next DO number
    const lastDO = await this._prisma.purchase_orders.findFirst({
      orderBy: { delivery_number: 'desc' },
      where: {
        delivery_number: { not: null },
      },
      select: { delivery_number: true },
    });

    const doNumber = generateNextId(
      'DO',
      lastDO?.delivery_number ? idToNumber(lastDO.delivery_number) : 0,
    );

    const result = await this._prisma.purchase_orders.update({
      where: { id },
      data: {
        order_status: purchase_order_status.confirmed,
        delivery_number: doNumber,
        delivery_date: dto.delivery_date,
        confirmed_at: new Date(),
        updated_at: new Date(),
        confirmed_by: userId,
      },
    });

    this.logger.log(
      `Successfully confirmed purchase order ${id} with delivery number ${doNumber}`,
    );
    return result;
  }

  async ship(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Shipping purchase order ${id} for store ${store_id}`);

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // akan di assign otomatis ke user yang login
    const userId = header.user.id;

    // Check if PO status is allowed to ship
    const disallowedStatuses = [
      purchase_order_status.shipped,
      purchase_order_status.cancelled,
      purchase_order_status.received,
    ] as purchase_order_status[];
    if (disallowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be shipped',
      );
    }

    const result = await this._prisma.purchase_orders.update({
      where: { id },
      data: {
        order_status: purchase_order_status.shipped,
        shipped_at: new Date(),
        updated_at: new Date(),
        shipped_by: userId,
      },
    });

    this.logger.log(`Successfully shipped purchase order ${id}`);
    return result;
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Receiving purchase order ${id} for store ${store_id}`);

    let userId = dto.userId;
    // Jika yang login adalah staff, maka otomatis assign ke user tersebut
    const isStaff = header.user.is_staff;
    if (isStaff) {
      userId = header.user.id;
    }

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: {
        id: true,
        order_status: true,
        order_number: true,
      },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // akan di assign otomatis ke user yang login
    // Check if PO status is allowed to receive
    const disallowedStatuses = [
      purchase_order_status.received,
      purchase_order_status.cancelled,
    ] as purchase_order_status[];
    if (disallowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be received',
      );
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // --- Get PO items to process
      const poItems = await tx.purchase_order_items.findMany({
        where: { purchase_order_id: id },
        select: {
          id: true,
          master_inventory_item_id: true,
          quantity: true,
        },
      });

      if (!poItems.length) {
        throw new BadRequestException('No items found in purchase order');
      }

      // --- Get current inventory items data
      const inventoryItems = await tx.master_inventory_items.findMany({
        where: {
          id: { in: poItems.map((i) => i.master_inventory_item_id) },
          store_id: store_id,
        },
      });

      // Validate all items exist and belong to the store
      const invById = new Map(inventoryItems.map((it) => [it.id, it]));
      const missingItems = poItems.filter(
        (item) => !invById.has(item.master_inventory_item_id),
      );
      if (missingItems.length > 0) {
        throw new BadRequestException(
          `Some inventory items not found or don't belong to store: ${missingItems.map((i) => i.master_inventory_item_id).join(', ')}`,
        );
      }

      // --- Update PO items
      // Menambahkan actual quantity
      const poItemsUpdate = poItems.map((item) => {
        const itemDto = dto.productItems.find((i) => i.id === item.id);
        if (!itemDto) {
          throw new BadRequestException(
            `Item id ${item.id} not found in purchase order items`,
          );
        }

        return tx.purchase_order_items.update({
          where: {
            id: item.id,
          },
          data: {
            actual_quantity: itemDto.actualQuantity,
            diff_quantity: itemDto.actualQuantity - item.quantity,
            updated_at: new Date(),
            notes: itemDto.notes ?? null,
          },
        });
      });

      // --- Increment stock quantities
      const stockUpdates = poItems.map((item) => {
        const inv = invById.get(item.master_inventory_item_id)!;
        const newQuantity = inv.stock_quantity + item.quantity;

        return tx.master_inventory_items.update({
          where: { id: item.master_inventory_item_id },
          data: {
            stock_quantity: newQuantity,
            updated_at: new Date(),
          },
        });
      });

      // --- Create stock adjustment records
      const stockAdjustments = poItems.map((item) => {
        const inv = invById.get(item.master_inventory_item_id)!;
        const previousQuantity = inv.stock_quantity;
        const newQuantity = previousQuantity + item.quantity;

        return tx.inventory_stock_adjustments.create({
          data: {
            master_inventory_items_id: item.master_inventory_item_id,
            stores_id: store_id,
            action: stock_adjustment_action.STOCK_IN,
            adjustment_quantity: item.quantity,
            notes: `Received PO (${existingPO.order_number})`,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
          },
        });
      });

      // Execute all update items, stock updates, and adjustments
      await Promise.all([
        ...stockUpdates,
        ...stockAdjustments,
        ...poItemsUpdate,
      ]);

      // --- Update PO status to received
      return await tx.purchase_orders.update({
        where: { id },
        data: {
          order_status: purchase_order_status.received,
          received_by: userId,
          received_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    this.logger.log(`Successfully received purchase order ${id}`);
    return result;
  }

  async pay(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(
      `Processing payment for purchase order ${id} for store ${store_id}`,
    );

    // akan di assign otomatis ke user yang login
    const userId = header.user.id;

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to pay
    const disallowedStatuses = [
      purchase_order_status.paid,
      purchase_order_status.cancelled,
    ] as purchase_order_status[];
    if (disallowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException('Purchase Order is not allowed to be paid');
    }

    const result = await this._prisma.purchase_orders.update({
      where: { id },
      data: {
        order_status: purchase_order_status.paid,
        paid_at: new Date(),
        updated_at: new Date(),
        paid_by: userId,
      },
    });

    this.logger.log(`Successfully processed payment for purchase order ${id}`);
    return result;
  }
}
