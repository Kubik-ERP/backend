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

  /**
   * Generate inventory category code based on category name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateCategoryCode(
    categoryName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from category name
      const words = categoryName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingCategories =
        await this._prisma.master_inventory_categories.findMany({
          where: {
            code: {
              startsWith: prefix,
            },
            stores_has_master_inventory_categories: {
              some: {
                stores_id: storeId,
              },
            },
          },
          select: {
            code: true,
          },
        });

      let maxCounter = 0;

      // Extract counter from existing codes and find the maximum
      existingCategories.forEach((category) => {
        const numberPart = category.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate category code: ${error.message}`);
      throw new BadRequestException('Failed to generate category code');
    }
  }

  /**
   * Validate duplicate category code within a store
   */
  private async validateDuplicateCategoryCode(
    code: string,
    excludeId?: string,
    storeId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      code,
    };

    if (excludeId) {
      whereCondition.id = {
        not: excludeId,
      };
    }

    if (storeId) {
      whereCondition.stores_has_master_inventory_categories = {
        some: {
          stores_id: storeId,
        },
      };
    }

    const existingCategory =
      await this._prisma.master_inventory_categories.findFirst({
        where: whereCondition,
      });

    if (existingCategory) {
      throw new BadRequestException(`Category code '${code}' already exists`);
    }
  }

  public async create(
    dto: CreateInventoryCategoryDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicate(dto.name, undefined, store_id);

    // Generate code if not provided
    const categoryCode =
      dto.code || (await this.generateCategoryCode(dto.name, store_id));

    // Validate for duplicate code within the store
    await this.validateDuplicateCategoryCode(categoryCode, undefined, store_id);

    const category = await this._prisma.master_inventory_categories.create({
      data: {
        name: dto.name,
        code: categoryCode,
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

    this.logger.log(
      `Inventory category created: ${category.name} with code: ${category.code}`,
    );
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
      where.OR = [
        {
          name: { contains: search, mode: 'insensitive' },
        },
        {
          code: { contains: search, mode: 'insensitive' },
        },
      ];
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

    // Validate for duplicate category code if it's being updated
    if (dto.code && dto.code !== existing.code) {
      await this.validateDuplicateCategoryCode(dto.code, id, store_id);
    }

    const updated = await this._prisma.master_inventory_categories.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
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
