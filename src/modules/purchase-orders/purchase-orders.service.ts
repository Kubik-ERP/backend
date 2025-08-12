import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { UpdatePurchaseOrdersDto } from './dto/update-purchase-orders.dto';
import { PurchaseOrdersListDto } from './dto/purchase-orders-list.dto';
import { Prisma, purchase_order_status } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { camelToSnake } from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { generateNextId } from 'src/common/helpers/common.helpers';
import { idToNumber } from 'src/common/helpers/common.helpers';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: PurchaseOrdersListDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

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
    if (orderByField === 'supplierName') {
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
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const purchaseOrder = await this._prisma.purchase_orders.findUnique({
      where: { id, store_id },
      include: {
        purchase_order_items: true,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder;
  }

  async create(dto: CreatePurchaseOrdersDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const { productItems } = dto;
    if (!productItems?.length) {
      throw new BadRequestException('productItems is required');
    }

    // Validasi Supplier
    const supplier = await this._prisma.master_suppliers.findFirst({
      where: {
        id: dto.supplierId,
        stores_has_master_suppliers: { some: { stores_id: store_id } },
      },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    // --- Fetch + validate items belong to this store
    const itemIds = productItems.map((i) => i.masterItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
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

    // TODO(PO): tanyakan terkait reorder level dan minumum stok quantity

    const result = await this._prisma.$transaction(async (tx) => {
      // Generate next PO number
      const lastPO = await tx.purchase_orders.findFirst({
        orderBy: { id: 'desc' },
        select: { order_number: true },
      });

      const poNumber = generateNextId(
        'PO',
        lastPO?.order_number ? idToNumber(lastPO.order_number) : 0,
      );

      // Prepare PO items & total
      let totalPrice = 0;
      const purchaseOrderItems = productItems.map(
        ({ masterItemId, quantity }) => {
          const inv = invById.get(masterItemId)!;
          const unitPrice = Number(inv.price_per_unit); // consider Decimal if you need exact money math
          const lineTotal = unitPrice * quantity;
          totalPrice += lineTotal;

          return {
            master_inventory_item_id: masterItemId,
            quantity,
            unit_price: unitPrice,
            total_price: lineTotal,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
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
          suppier_info: {
            supplier_name: supplier.supplier_name,
            contact_person: supplier.contact_person,
            phone_number: supplier.phone_number,
            address: supplier.address,
          },
          purchase_order_items: {
            createMany: { data: purchaseOrderItems },
          },
        },
        include: { purchase_order_items: true },
      });

      // ⚠️ Business note: normally stock is adjusted on receiving (goods receipt), not PO creation.
      // If you really want to reserve/decrement here, keep this block.
      // await Promise.all(
      //   purchaseOrderItems.map((item) =>
      //     tx.master_inventory_items.update({
      //       where: { id: item.master_inventory_item_id },
      //       data: { stock_quantity: { decrement: item.quantity } },
      //     }),
      //   ),
      // );

      return po;
    });

    return result;
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrdersDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

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
        stores_has_master_suppliers: { some: { stores_id: store_id } },
      },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    // Validate items belong to this store
    const itemIds = productItems.map((i) => i.masterItemId);
    const inventoryItems = await this._prisma.master_inventory_items.findMany({
      where: {
        id: { in: itemIds },
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
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
        item_info: any;
      }> = [];
      const itemsUpdate: Array<{
        id: string;
        master_inventory_item_id: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        item_info: any;
      }> = [];

      for (const item of productItems) {
        const inv = invById.get(item.masterItemId)!;
        const unitPrice = Number(inv.price_per_unit);
        const lineTotal = unitPrice * item.quantity;
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
            unit_price: unitPrice,
            total_price: lineTotal,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
            },
          });
        } else {
          itemsCreate.push({
            master_inventory_item_id: item.masterItemId,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: lineTotal,
            item_info: {
              sku: inv.sku,
              name: inv.name,
              brand_name: inv.master_brands?.brand_name ?? '',
              unit: inv.unit,
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
          suppier_info: {
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
                updated_at: new Date(),
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

    return result;
  }

  async cancel(
    id: string,
    dto: CancelPurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to cancel
    // TODO(PO): apakah kondisi ini sudah benar?
    const allowedStatuses = [
      purchase_order_status.pending,
      purchase_order_status.confirmed,
    ] as purchase_order_status[];
    if (!allowedStatuses.includes(existingPO.order_status)) {
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
      },
    });

    return cancelledPO;
  }

  async confirm(
    id: string,
    dto: ConfirmPurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to confirm
    const allowedStatuses = [
      purchase_order_status.pending,
    ] as purchase_order_status[];
    if (!allowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be confirmed',
      );
    }

    // Generate next DO number
    const lastDO = await this._prisma.purchase_orders.findFirst({
      orderBy: { id: 'desc' },
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
        updated_at: new Date(),
      },
    });

    return result;
  }

  async ship(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to ship
    const allowedStatuses = [
      purchase_order_status.confirmed,
    ] as purchase_order_status[];
    if (!allowedStatuses.includes(existingPO.order_status)) {
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
      },
    });

    return result;
  }

  async receive(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to receive
    const allowedStatuses = [
      purchase_order_status.shipped,
    ] as purchase_order_status[];
    if (!allowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be received',
      );
    }

    const result = await this._prisma.$transaction(async (tx) => {
      // --- Decrement stock inventory items
      const poItems = await tx.purchase_order_items.findMany({
        where: { purchase_order_id: id },
        select: {
          master_inventory_item_id: true,
          quantity: true,
        },
      });
      await Promise.all(
        poItems.map((i) =>
          tx.master_inventory_items.update({
            where: { id: i.master_inventory_item_id },
            data: {
              stock_quantity: { decrement: i.quantity },
            },
          }),
        ),
      );

      // --- Update PO status
      return await tx.purchase_orders.update({
        where: { id },
        data: {
          order_status: purchase_order_status.received,
          received_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    return result;
  }

  async pay(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Ensure PO exists & belongs to store (prevents cross-store updates)
    const existingPO = await this._prisma.purchase_orders.findFirst({
      where: { id, store_id },
      select: { id: true, order_status: true },
    });
    if (!existingPO) throw new BadRequestException('Purchase Order not found');

    // Check if PO status is allowed to pay
    const allowedStatuses = [
      purchase_order_status.received,
    ] as purchase_order_status[];
    if (!allowedStatuses.includes(existingPO.order_status)) {
      throw new BadRequestException(
        'Purchase Order is not allowed to be received',
      );
    }

    const result = await this._prisma.purchase_orders.update({
      where: { id },
      data: {
        order_status: purchase_order_status.paid,
        paid_at: new Date(),
        updated_at: new Date(),
      },
    });

    return result;
  }
}
