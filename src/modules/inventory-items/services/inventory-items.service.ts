import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateInventoryItemDto,
  GetInventoryItemsDto,
  UpdateInventoryItemDto,
} from '../dtos';

type OrderByKey = 'id' | 'created_at' | 'name' | 'updated_at' | 'sku';

@Injectable()
export class InventoryItemsService {
  private readonly logger = new Logger(InventoryItemsService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async create(
    dto: CreateInventoryItemDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicateSku(dto.sku, undefined, store_id);

    const item = await this._prisma.master_inventory_items.create({
      data: {
        name: dto.name,
        brand_id: dto.brandId,
        barcode: dto.barcode,
        sku: dto.sku,
        category_id: dto.categoryId,
        unit: dto.unit,
        notes: dto.notes,
        stock_quantity: dto.stockQuantity,
        reorder_level: dto.reorderLevel,
        minimum_stock_quantity: dto.minimumStockQuantity,
        expiry_date: dto.expiryDate ? new Date(dto.expiryDate) : null,
        storage_location_id: dto.storageLocationId,
        price_per_unit: dto.pricePerUnit,
        supplier_id: dto.supplierId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this._prisma.stores_has_master_inventory_items.create({
      data: {
        stores_id: store_id,
        master_inventory_items_id: item.id,
      },
    });

    this.logger.log(`Inventory item created: ${item.name}`);
    return item;
  }

  public async list(
    query: GetInventoryItemsDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const {
      page = 1,
      pageSize = 10,
      search,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      stores_has_master_inventory_items: {
        some: { stores_id: store_id },
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this._prisma.master_inventory_items.findMany({
        where,
        orderBy: { [orderBy as OrderByKey]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.master_inventory_items.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return { items, meta: { page, pageSize, total, totalPages } };
  }

  public async detail(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const item = await this._prisma.master_inventory_items.findFirst({
      where: {
        id,
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
    });
    if (!item)
      throw new NotFoundException(
        `Inventory item with ID ${id} not found in this store`,
      );
    return item;
  }

  public async update(
    id: string,
    dto: UpdateInventoryItemDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    if (dto.sku && dto.sku !== existing.sku) {
      await this.ensureNotDuplicateSku(dto.sku, id, store_id);
    }

    const updated = await this._prisma.master_inventory_items.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.brandId !== undefined && { brand_id: dto.brandId }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.categoryId !== undefined && { category_id: dto.categoryId }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.stockQuantity !== undefined && {
          stock_quantity: dto.stockQuantity,
        }),
        ...(dto.reorderLevel !== undefined && {
          reorder_level: dto.reorderLevel,
        }),
        ...(dto.minimumStockQuantity !== undefined && {
          minimum_stock_quantity: dto.minimumStockQuantity,
        }),
        ...(dto.expiryDate !== undefined && {
          expiry_date: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.storageLocationId !== undefined && {
          storage_location_id: dto.storageLocationId,
        }),
        ...(dto.pricePerUnit !== undefined && {
          price_per_unit: dto.pricePerUnit,
        }),
        ...(dto.supplierId !== undefined && { supplier_id: dto.supplierId }),
        updated_at: new Date(),
      },
    });
    this.logger.log(`Inventory item updated: ${updated.name}`);
    return updated;
  }

  public async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    await this._prisma.stores_has_master_inventory_items.deleteMany({
      where: { stores_id: store_id, master_inventory_items_id: id },
    });

    const other = await this._prisma.stores_has_master_inventory_items.count({
      where: { master_inventory_items_id: id },
    });

    if (other === 0) {
      await this._prisma.master_inventory_items.delete({ where: { id } });
    }
    this.logger.log(`Inventory item deleted: ${existing.name}`);
  }

  private async ensureNotDuplicateSku(
    sku: string,
    excludeId?: string,
    storeId?: string,
  ) {
    const where: any = { sku: { equals: sku, mode: 'insensitive' } };
    if (excludeId) where.id = { not: excludeId };
    if (storeId) {
      where.stores_has_master_inventory_items = {
        some: { stores_id: storeId },
      };
    }
    const existing = await this._prisma.master_inventory_items.findFirst({
      where,
    });
    if (existing) {
      throw new BadRequestException(
        `Inventory item with SKU '${sku}' already exists in this store`,
      );
    }
  }
}
