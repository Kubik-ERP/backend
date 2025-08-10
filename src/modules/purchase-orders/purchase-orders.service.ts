import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { UpdatePurchaseOrdersDto } from './dto/update-purchase-orders.dto';
import { PurchaseOrdersListDto } from './dto/purchase-orders-list.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { camelToSnake } from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: PurchaseOrdersListDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

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
        master_suppliers: {
          supplier_name: orderDirection,
        },
      });
    } else if (orderByField === 'deliveryDate') {
      orderBy.push({
        purchase_delivery_orders: {
          delivery_date: orderDirection,
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

        include: {
          master_suppliers: {
            select: {
              supplier_name: true,
            },
          },
          purchase_delivery_orders: {
            select: {
              delivery_date: true,
            },
          },
        },
      }),
      this._prisma.purchase_orders.count({
        where: filters,
      }),
    ]);

    const purchaseOrders = items.map((item) => ({
      id: item.id,
      order_number: item.order_number,
      supplier_name: item.master_suppliers?.supplier_name || null,
      order_date: item.order_date,
      delivery_date: item.purchase_delivery_orders?.delivery_date || null,
      order_status: item.order_status,
      total_price: item.total_price,
    }));

    return {
      items: purchaseOrders,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  findOne(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    return `Coming soon`;
  }

  async create(
    createPurchaseOrderDto: CreatePurchaseOrdersDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // --- Get Master Items

    return `Coming soon`;
  }

  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrdersDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    return `Coming soon`;
  }

  async cancel(
    id: string,
    cancelPurchaseOrderDto: CancelPurchaseOrderDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    return `Coming soon`;
  }
}
