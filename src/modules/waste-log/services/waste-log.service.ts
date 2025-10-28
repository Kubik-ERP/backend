import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateWasteLogDto,
  CreateWasteLogItemDto,
  GetWasteLogsDto,
  UpdateWasteLogDto,
  UpdateWasteLogItemDto,
  WasteLogListResponseDto,
  WasteLogResponseDto,
} from '../dtos';
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';
import { ProductsService } from 'src/modules/products/products.service';
import {
  CreateProductPortionStockAdjustmentDto,
  ProductPortionActionDto,
} from 'src/modules/products/dto/create-product-portion-stock-adjustment.dto';

@Injectable()
export class WasteLogService {
  private readonly logger = new Logger(WasteLogService.name);

  constructor(
    private readonly _prisma: PrismaService,
    private readonly _productsService: ProductsService,
  ) {}

  /**
   * Validate if batch cooking recipe exists in the store
   * @param batchId - The batch cooking recipe ID to validate
   * @param storeId - The store ID to check against
   * @throws NotFoundException if batch cooking recipe not found
   */
  private async validateBatchCookingRecipe(
    batchId: string,
    storeId: string,
  ): Promise<void> {
    const batchExists = await this._prisma.batch_cooking_recipe.findFirst({
      where: {
        id: batchId,
        store_id: storeId,
      },
    });

    if (!batchExists) {
      throw new NotFoundException('Batch cooking recipe not found');
    }
  }

  /**
   * Validate if batch cooking recipe exists in the store
   * @param batchId - The batch cooking recipe ID to validate
   * @param storeId - The store ID to check against
   * @throws NotFoundException if batch cooking recipe not found
   */
  private async validateBatchCookingRecipe(
    batchId: string,
    storeId: string,
  ): Promise<void> {
    const batchExists = await this._prisma.batch_cooking_recipe.findFirst({
      where: {
        id: batchId,
        store_id: storeId,
      },
    });

    if (!batchExists) {
      throw new NotFoundException('Batch cooking recipe not found');
    }
  }

  public async create(
    dto: CreateWasteLogDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if batchId exists in batch_cooking_recipe table
    if (dto.batchId) {
      await this.validateBatchCookingRecipe(dto.batchId, store_id);
    }

    try {
      // Start transaction
      const result = await this._prisma.$transaction(async (tx) => {
        // Create waste log
        const wasteLog = await tx.waste_log.create({
          data: {
            waste_log_id: uuidv4(),
            batch_id: dto.batchId || null,
            store_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Create waste log items with pre-processed photo URLs
        const wasteLogItems = [];
        for (let i = 0; i < dto.payload.length; i++) {
          const item = dto.payload[i];

          const wasteLogItem = await tx.waste_log_item.create({
            data: {
              waste_log_item_id: uuidv4(),
              waste_log_id: wasteLog.waste_log_id,
              inventory_item_id: item.inventory_item_id,
              category: item.category || null,
              quantity: item.quantity,
              uom: item.uom || null,
              notes: item.notes || null,
              photo_url: (item as any).photo_url || null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          wasteLogItems.push(wasteLogItem);
        }

        return { wasteLog, wasteLogItems };
      });

      // If batchId is provided, reduce product stock quantity
      if (dto.batchId) {
        await this.reduceProductStockFromWaste(
          dto.batchId,
          dto.payload,
          store_id,
          header,
        );
      }

      // Fetch complete data with relations
      return await this.detail(result.wasteLog.waste_log_id, header);
    } catch (error) {
      this.logger.error('Error creating waste log:', error);
      throw new BadRequestException('Failed to create waste log');
    }
  }

  public async detail(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const wasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
      include: {
        waste_log_item: {
          include: {
            master_inventory_items: {
              select: {
                name: true,
              },
            },
          },
        },
        stores: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!wasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    return {
      wasteLogId: wasteLog.waste_log_id,
      batchId: wasteLog.batch_id || undefined,
      storeId: wasteLog.store_id,
      storeName: wasteLog.stores?.name || undefined,
      wasteLogItems: wasteLog.waste_log_item.map((item) => ({
        wasteLogItemId: item.waste_log_item_id,
        inventoryItemId: item.inventory_item_id,
        inventoryItemName: item.master_inventory_items?.name,
        category: item.category || undefined,
        quantity: Number(item.quantity),
        uom: item.uom || undefined,
        notes: item.notes || undefined,
        photoUrl: item.photo_url || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      createdAt: wasteLog.created_at,
      updatedAt: wasteLog.updated_at,
    };
  }

  public async update(
    id: string,
    dto: UpdateWasteLogDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    // Check if batchId exists in batch_cooking_recipe table (only if batchId is provided)
    if (dto.batchId) {
      await this.validateBatchCookingRecipe(dto.batchId, store_id);
    }

    try {
      await this._prisma.$transaction(async (tx) => {
        // Update waste log
        await tx.waste_log.update({
          where: { waste_log_id: id },
          data: {
            batch_id: dto.batchId || null,
            updated_at: new Date(),
          },
        });

        // Delete existing items
        await tx.waste_log_item.deleteMany({
          where: { waste_log_id: id },
        });

        // Create new items with pre-processed photo URLs
        for (let i = 0; i < dto.payload.length; i++) {
          const item = dto.payload[i];

          await tx.waste_log_item.create({
            data: {
              waste_log_item_id: uuidv4(),
              waste_log_id: id,
              inventory_item_id: item.inventory_item_id,
              category: item.category || null,
              quantity: item.quantity,
              uom: item.uom || null,
              notes: item.notes || null,
              photo_url: (item as any).photo_url || null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      });

      return await this.detail(id, header);
    } catch (error) {
      this.logger.error('Error updating waste log:', error);
      throw new BadRequestException('Failed to update waste log');
    }
  }

  public async list(
    query: GetWasteLogsDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogListResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;
    const offset = (page - 1) * limit;

    const where: any = {
      store_id,
    };

    if (search) {
      where.OR = [
        { batch_id: { contains: search, mode: 'insensitive' } },
        {
          waste_log_item: {
            some: {
              master_inventory_items: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [wasteLogs, total] = await Promise.all([
      this._prisma.waste_log.findMany({
        where,
        include: {
          waste_log_item: {
            include: {
              master_inventory_items: {
                select: {
                  name: true,
                },
              },
            },
          },
          stores: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this._prisma.waste_log.count({ where }),
    ]);

    const data = wasteLogs.map((wasteLog) => ({
      wasteLogId: wasteLog.waste_log_id,
      batchId: wasteLog.batch_id || undefined,
      storeId: wasteLog.store_id,
      storeName: wasteLog.stores?.name || undefined,
      wasteLogItems: wasteLog.waste_log_item.map((item) => ({
        wasteLogItemId: item.waste_log_item_id,
        inventoryItemId: item.inventory_item_id,
        inventoryItemName: item.master_inventory_items?.name,
        category: item.category || undefined,
        quantity: Number(item.quantity),
        uom: item.uom || undefined,
        notes: item.notes || undefined,
        photoUrl: item.photo_url || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      createdAt: wasteLog.created_at,
      updatedAt: wasteLog.updated_at,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async remove(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    try {
      await this._prisma.$transaction(async (tx) => {
        // Delete waste log items first (due to foreign key constraint)
        await tx.waste_log_item.deleteMany({
          where: { waste_log_id: id },
        });

        // Delete waste log
        await tx.waste_log.delete({
          where: { waste_log_id: id },
        });
      });
    } catch (error) {
      this.logger.error('Error deleting waste log:', error);
      throw new BadRequestException('Failed to delete waste log');
    }
  }

  public async removeItem(
    wasteLogId: string,
    itemId: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists and belongs to the store
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: wasteLogId,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    // Check if waste log item exists
    const existingItem = await this._prisma.waste_log_item.findFirst({
      where: {
        waste_log_item_id: itemId,
        waste_log_id: wasteLogId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Waste log item not found');
    }

    try {
      await this._prisma.waste_log_item.delete({
        where: { waste_log_item_id: itemId },
      });
    } catch (error) {
      this.logger.error('Error deleting waste log item:', error);
      throw new BadRequestException('Failed to delete waste log item');
    }
  }

  /**
   * Reduce product stock quantity based on waste log payload
   * Follows the relationship: batch_id -> recipe_id -> product_id
   */
  private async reduceProductStockFromWaste(
    batchId: string,
    payload: any[],
    storeId: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    try {
      // Get batch cooking recipe with menu recipe and product information
      const batchRecipe = await this._prisma.batch_cooking_recipe.findFirst({
        where: {
          id: batchId,
          store_id: storeId,
        },
        include: {
          menu_recipes: {
            select: {
              recipe_id: true,
              recipe_name: true,
              product_id: true,
            },
          },
        },
      });

      if (!batchRecipe || !batchRecipe.menu_recipes?.product_id) {
        this.logger.warn(
          `No product found for batch ${batchId} or recipe not linked to product`,
        );
        return;
      }

      const productId = batchRecipe.menu_recipes.product_id;
      const recipeName = batchRecipe.menu_recipes.recipe_name;

      // Calculate total waste quantity from all payload items
      const totalWasteQuantity = payload.reduce((sum, item) => {
        return sum + (item.quantity || 0);
      }, 0);

      if (totalWasteQuantity <= 0) {
        this.logger.warn('No waste quantity to reduce from product stock');
        return;
      }

      // Use ProductsService to decrease stock
      const stockAdjustmentDto: CreateProductPortionStockAdjustmentDto = {
        action: ProductPortionActionDto.DECREASE,
        adjustmentQuantity: totalWasteQuantity,
        notes: `Stock reduction due to waste log for batch ${batchId} (Recipe: ${recipeName})`,
      };

      await this._productsService.addProductPortionStockAdjustment(
        productId,
        stockAdjustmentDto,
        header,
      );

      this.logger.log(
        `Successfully reduced product ${productId} stock by ${totalWasteQuantity} due to waste log for batch ${batchId} (Recipe: ${recipeName})`,
      );
    } catch (error) {
      this.logger.error(
        `Error reducing product stock for batch ${batchId}:`,
        error,
      );
      // Don't throw error to avoid rolling back waste log creation
      // Just log the error for monitoring
    }
  }
}
