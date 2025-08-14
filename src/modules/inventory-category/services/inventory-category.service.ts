import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryCategoryDto } from '../dtos/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from '../dtos/update-inventory-category.dto';
import { GetInventoryCategoriesDto } from '../dtos/get-inventory-categories.dto';

@Injectable()
export class InventoryCategoryService {
  private readonly logger = new Logger(InventoryCategoryService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async create(
    dto: CreateInventoryCategoryDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicate(dto.name, undefined, store_id);

    const category = await this._prisma.master_inventory_categories.create({
      data: {
        name: dto.name,
        notes: dto.notes,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this._prisma.stores_has_master_inventory_categories.create({
      data: {
        stores_id: store_id,
        master_inventory_categories_id: category.id,
      },
    });

    this.logger.log(`Inventory category created: ${category.name}`);
    return category;
  }

  public async list(
    query: GetInventoryCategoriesDto,
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
      stores_has_master_inventory_categories: {
        some: { stores_id: store_id },
      },
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this._prisma.master_inventory_categories.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.master_inventory_categories.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      meta: { page, pageSize, total, totalPages },
    };
  }

  public async detail(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const category = await this._prisma.master_inventory_categories.findFirst({
      where: {
        id,
        stores_has_master_inventory_categories: {
          some: { stores_id: store_id },
        },
      },
    });
    if (!category)
      throw new NotFoundException(
        `Inventory category with ID ${id} not found in this store`,
      );
    return category;
  }

  public async update(
    id: string,
    dto: UpdateInventoryCategoryDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    if (dto.name && dto.name !== existing.name) {
      await this.ensureNotDuplicate(dto.name, id, store_id);
    }

    const updated = await this._prisma.master_inventory_categories.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updated_at: new Date(),
      },
    });
    this.logger.log(`Inventory category updated: ${updated.name}`);
    return updated;
  }

  public async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    const existing = await this.detail(id, header);

    // Prevent delete if category is linked to any inventory item in this store
    const linkedItemsCount = await this._prisma.master_inventory_items.count({
      where: {
        category_id: id,
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
    });
    if (linkedItemsCount > 0) {
      throw new BadRequestException(
        'Inventory category cannot be deleted because it is linked to one or more inventory items in this store',
      );
    }

    await this._prisma.stores_has_master_inventory_categories.deleteMany({
      where: { stores_id: store_id, master_inventory_categories_id: id },
    });

    const otherRelations =
      await this._prisma.stores_has_master_inventory_categories.count({
        where: { master_inventory_categories_id: id },
      });
    if (otherRelations === 0) {
      await this._prisma.master_inventory_categories.delete({ where: { id } });
    }
    this.logger.log(`Inventory category deleted: ${existing.name}`);
  }

  private async ensureNotDuplicate(
    name: string,
    excludeId?: string,
    storeId?: string,
  ) {
    const where: any = {
      name: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) where.id = { not: excludeId };
    if (storeId) {
      where.stores_has_master_inventory_categories = {
        some: { stores_id: storeId },
      };
    }
    const existing = await this._prisma.master_inventory_categories.findFirst({
      where,
    });
    if (existing) {
      throw new BadRequestException(
        `Inventory category with name '${name}' already exists in this store`,
      );
    }
  }
}
