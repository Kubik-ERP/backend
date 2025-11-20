import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { requireStoreId, requireUser } from 'src/common/helpers/common.helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { CancelBatchRecipeDto } from '../dtos/cancel-batch-recipe.dto';
import { CompleteBatchRecipeDto } from '../dtos/complete-batch-recipe.dto';
import { CreateBatchRecipeDto } from '../dtos/create-batch-recipe.dto';
import { UpdateBatchRecipeDto } from '../dtos/update-batch-recipe.dto';
import { BatchRecipeStatus } from '../interfaces/batch-recipe.interface';
import { FindBatchRecipesQueryDto } from '../dtos/find-batch-recipes-query.dto';
import { StockAdjustmentActionDto } from 'src/modules/inventory-items/dtos/create-stock-adjustment.dto';

enum ProductPortionAction {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
}

@Injectable()
export class BatchRecipeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: FindBatchRecipesQueryDto,
    header: ICustomRequestHeaders,
  ) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);
    const ownerId = Number(user.ownerId);

    if (!Number.isInteger(ownerId)) {
      throw new BadRequestException('Owner tidak ditemukan');
    }

    await this.ensureStoreOwnedByOwner(storeId, ownerId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, batches] = await this.prisma.$transaction([
      this.prisma.batch_cooking_recipe.count({
        where: { store_id: storeId },
      }),
      this.prisma.batch_cooking_recipe.findMany({
        where: { store_id: storeId },
        include: {
          menu_recipes: {
            select: {
              recipe_id: true,
              recipe_name: true,
              target_yield: true,
              output_unit: true,
              base_recipe: true,
              cost_portion: true,
              margin_per_selling_price_rp: true,
              margin_per_selling_price_percent: true,
              products: {
                select: {
                  price: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: batches.map((batch) => this.formatBatch(batch)),
      meta: {
        total,
        page,
        limit,
        totalPages: limit ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async findById(batchId: string, header: ICustomRequestHeaders) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);
    const ownerId = Number(user.ownerId);

    if (!Number.isInteger(ownerId)) {
      throw new BadRequestException('Owner tidak ditemukan');
    }

    await this.ensureStoreOwnedByOwner(storeId, ownerId);

    return this.getBatchDetail(batchId, storeId);
  }

  async delete(batchId: string, header: ICustomRequestHeaders) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);
    const ownerId = Number(user.ownerId);

    if (!Number.isInteger(ownerId)) {
      throw new BadRequestException('Owner tidak ditemukan');
    }

    await this.ensureStoreOwnedByOwner(storeId, ownerId);

    const batch = await this.getBatchOrThrow(batchId, storeId);
    if (
      batch.status === BatchRecipeStatus.COOKING ||
      batch.status === BatchRecipeStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Batch yang sedang dimasak atau selesai tidak dapat dihapus',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.batch_cooking_recipe_ingredient.deleteMany({
        where: { batch_id: batch.id },
      });

      await tx.batch_cooking_recipe.delete({
        where: { id: batch.id },
      });
    });
  }

  async create(dto: CreateBatchRecipeDto, header: ICustomRequestHeaders) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);

    const recipe = await this.prisma.menu_recipes.findFirst({
      where: {
        recipe_id: dto.recipeId,
        store_id: storeId,
      },
      include: {
        ingredients: {
          include: {
            master_inventory_items: {
              select: {
                price_per_unit: true,
                id: true,
                name: true,
              },
            },
          },
        },
        products: {
          select: {
            price: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(
        'Recipe tidak ditemukan atau bukan milik store ini',
      );
    }

    if (!recipe.ingredients.length) {
      throw new BadRequestException('Recipe belum memiliki ingredient');
    }

    const ratio = this.getYieldRatio(dto.batchTargetYield, recipe.target_yield);
    const now = new Date();
    const { entries: ingredientEntries, costBatch } =
      this.buildIngredientEntries(
        recipe.ingredients,
        ratio,
        now,
        recipe.recipe_id,
      );
    const costPortion = this.calculateCostPerPortion(
      costBatch,
      dto.batchTargetYield,
    );
    const marginSellingPrice = this.calculateMarginSellingPrice(
      this.decimalToNumber(recipe.products?.price),
      costPortion,
    );

    const createdBatch = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch_cooking_recipe.create({
        data: {
          recipe_id: recipe.recipe_id,
          date: new Date(dto.date),
          batch_target_yield: dto.batchTargetYield,
          batch_waste: dto.batchWaste ?? 0,
          notes: dto.notes ?? null,
          created_at: now,
          created_by: user.id,
          updated_at: now,
          updated_by: user.id,
          status: BatchRecipeStatus.PLANNED,
          cost_batch: costBatch,
          cost_portion: costPortion,
          margin_selling_price: marginSellingPrice,
          store_id: storeId,
        },
      });

      await tx.batch_cooking_recipe_ingredient.createMany({
        data: ingredientEntries.map((entry) => ({
          ...entry,
          batch_id: batch.id,
        })),
      });

      return batch;
    });

    return this.getBatchDetail(createdBatch.id, storeId);
  }

  async update(
    batchId: string,
    dto: UpdateBatchRecipeDto,
    header: ICustomRequestHeaders,
  ) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);
    const ownerId = Number(user.ownerId);

    if (!Number.isInteger(ownerId)) {
      throw new BadRequestException('Owner tidak ditemukan');
    }

    await this.ensureStoreOwnedByOwner(storeId, ownerId);

    const batch = await this.getBatchOrThrow(batchId, storeId);
    if (
      batch.status === BatchRecipeStatus.COOKING ||
      batch.status === BatchRecipeStatus.COMPLETED ||
      batch.status === BatchRecipeStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Batch dengan status ini tidak dapat diubah',
      );
    }

    const recipeId = dto.recipeId ?? batch.recipe_id;
    const recipe = await this.prisma.menu_recipes.findFirst({
      where: {
        recipe_id: recipeId,
        store_id: storeId,
      },
      include: {
        ingredients: {
          include: {
            master_inventory_items: {
              select: {
                price_per_unit: true,
                id: true,
                name: true,
              },
            },
          },
        },
        products: {
          select: {
            price: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(
        'Recipe tidak ditemukan atau bukan milik store ini',
      );
    }

    if (!recipe.ingredients.length) {
      throw new BadRequestException('Recipe belum memiliki ingredient');
    }

    const targetYield =
      dto.batchTargetYield ?? batch.batch_target_yield ?? recipe.target_yield;

    if (!targetYield || targetYield <= 0) {
      throw new BadRequestException('batchTargetYield tidak valid');
    }

    const ratio = this.getYieldRatio(targetYield, recipe.target_yield);
    const now = new Date();

    const { entries: ingredientEntries, costBatch } =
      this.buildIngredientEntries(
        recipe.ingredients,
        ratio,
        now,
        recipe.recipe_id,
      );
    const costPortion = this.calculateCostPerPortion(costBatch, targetYield);
    const marginSellingPrice = this.calculateMarginSellingPrice(
      this.decimalToNumber(recipe.products?.price),
      costPortion,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.batch_cooking_recipe.update({
        where: { id: batch.id },
        data: {
          recipe_id: recipe.recipe_id,
          date: dto.date ? new Date(dto.date) : batch.date,
          batch_target_yield: targetYield,
          batch_waste: dto.batchWaste ?? batch.batch_waste ?? 0,
          notes: dto.notes ?? batch.notes,
          updated_at: now,
          updated_by: user.id,
          cost_batch: costBatch,
          cost_portion: costPortion,
          margin_selling_price: marginSellingPrice,
        },
      });

      await tx.batch_cooking_recipe_ingredient.deleteMany({
        where: { batch_id: batch.id },
      });

      if (ingredientEntries.length) {
        await tx.batch_cooking_recipe_ingredient.createMany({
          data: ingredientEntries.map((entry) => ({
            ...entry,
            batch_id: batch.id,
          })),
        });
      }
    });

    return this.getBatchDetail(batchId, storeId);
  }

  async startCooking(batchId: string, header: ICustomRequestHeaders) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);

    const batch = await this.getBatchOrThrow(batchId, storeId);

    if (
      batch.status !== null &&
      batch.status !== BatchRecipeStatus.PLANNED &&
      batch.status !== BatchRecipeStatus.CANCELLED
    ) {
      throw new BadRequestException('Batch tidak dapat dimulai');
    }

    if (batch.status === BatchRecipeStatus.CANCELLED) {
      throw new BadRequestException(
        'Batch yang dibatalkan tidak dapat dimulai',
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.applyInventoryAdjustmentsForBatch(
        tx,
        batch,
        storeId,
        user.id,
        now,
      );

      await tx.batch_cooking_recipe.update({
        where: { id: batch.id },
        data: {
          status: BatchRecipeStatus.COOKING,
          cooking_at: now,
          updated_at: now,
          updated_by: user.id,
        },
      });
    });

    return this.getBatchDetail(batchId, storeId);
  }

  async cancelCooking(
    batchId: string,
    dto: CancelBatchRecipeDto,
    header: ICustomRequestHeaders,
  ) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);

    const batch = await this.getBatchOrThrow(batchId, storeId);

    if (batch.status === BatchRecipeStatus.COMPLETED) {
      throw new BadRequestException(
        'Batch yang selesai tidak dapat dibatalkan',
      );
    }

    if (batch.status === BatchRecipeStatus.CANCELLED) {
      return this.getBatchDetail(batchId, storeId);
    }

    await this.prisma.batch_cooking_recipe.update({
      where: { id: batch.id },
      data: {
        status: BatchRecipeStatus.CANCELLED,
        notes: dto.reason ?? batch.notes,
        updated_at: new Date(),
        updated_by: user.id,
      },
    });

    return this.getBatchDetail(batchId, storeId);
  }

  async completeCooking(
    batchId: string,
    dto: CompleteBatchRecipeDto,
    header: ICustomRequestHeaders,
  ) {
    const storeId = requireStoreId(header);
    const user = requireUser(header);

    const batch = await this.getBatchOrThrow(batchId, storeId);

    if (batch.status === BatchRecipeStatus.CANCELLED) {
      throw new BadRequestException(
        'Batch yang dibatalkan tidak dapat diselesaikan',
      );
    }

    if (batch.status === BatchRecipeStatus.COMPLETED) {
      return this.getBatchDetail(batchId, storeId);
    }

    const now = new Date();
    const finalBatchWaste = dto.batchWaste ?? batch.batch_waste ?? 0;
    const portionStockIncrease = this.calculatePortionStockIncrease(
      batch.batch_target_yield,
      finalBatchWaste,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.batch_cooking_recipe.update({
        where: { id: batch.id },
        data: {
          status: BatchRecipeStatus.COMPLETED,
          batch_waste: finalBatchWaste,
          notes: dto.notes ?? batch.notes,
          updated_at: now,
          updated_by: user.id,
        },
      });

      if (dto.wasteLog?.items?.length) {
        const wasteLog = await tx.waste_log.create({
          data: {
            batch_id: batch.id,
            store_id: storeId,
            created_at: now,
            updated_at: now,
          },
        });

        for (const item of dto.wasteLog.items) {
          await this.validateInventoryItemOwnership(
            tx,
            item.inventoryItemId,
            storeId,
          );

          await tx.waste_log_item.create({
            data: {
              waste_log_id: wasteLog.waste_log_id,
              inventory_item_id: item.inventoryItemId,
              category: item.category ?? null,
              quantity: new Prisma.Decimal(item.quantity),
              uom: item.uom ?? null,
              notes: item.notes ?? null,
              photo_url: item.photoUrl ?? null,
              created_at: now,
              updated_at: now,
            },
          });
        }
      }

      await this.addPortionStockForBatch(tx, {
        batchId: batch.id,
        recipeId: batch.recipe_id,
        storeId,
        portionQty: portionStockIncrease,
        userId: user.id,
      });
    });

    return this.getBatchDetail(batchId, storeId);
  }

  private async applyInventoryAdjustmentsForBatch(
    tx: Prisma.TransactionClient,
    batch: {
      id: string;
      recipe_id?: string | null;
      batch_target_yield?: number | null;
    },
    storeId: string,
    userId: unknown,
    timestamp: Date,
  ) {
    const ingredientEntries = await tx.batch_cooking_recipe_ingredient.findMany(
      {
        where: { batch_id: batch.id },
        select: {
          qty: true,
          ingredients: {
            select: {
              ingredient_id: true,
              qty: true,
              master_inventory_items: {
                select: {
                  id: true,
                  name: true,
                  stock_quantity: true,
                },
              },
            },
          },
        },
      },
    );

    const adjustmentsMap = new Map<
      string,
      {
        itemId: string;
        itemName: string | null | undefined;
        totalQty: number;
        currentStock: number;
      }
    >();

    const batchYield = batch.batch_target_yield ?? 0;

    for (const entry of ingredientEntries) {
      const inventoryItem = entry.ingredients?.master_inventory_items;
      if (!inventoryItem) {
        continue;
      }

      const recipeMaterialQty =
        this.decimalToNumber(entry.ingredients?.qty) ?? null;
      const qty =
        recipeMaterialQty !== null && batchYield > 0
          ? recipeMaterialQty * batchYield
          : (entry.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      // Stock quantities are stored as integers, so round usage to match DB shape.
      const adjustmentQty = Math.round(qty);
      if (adjustmentQty <= 0) {
        continue;
      }

      const existing = adjustmentsMap.get(inventoryItem.id);
      if (existing) {
        existing.totalQty += adjustmentQty;
      } else {
        adjustmentsMap.set(inventoryItem.id, {
          itemId: inventoryItem.id,
          itemName: inventoryItem.name,
          totalQty: adjustmentQty,
          currentStock: inventoryItem.stock_quantity ?? 0,
        });
      }
    }

    if (!adjustmentsMap.size) {
      return;
    }

    const createdBy = this.normalizeUserId(userId);
    const recipeIdentifier = batch.recipe_id ?? batch.id;

    for (const adjustment of adjustmentsMap.values()) {
      if (adjustment.totalQty > adjustment.currentStock) {
        throw new BadRequestException(
          `Stok ${adjustment.itemName ?? 'inventory item'} tidak mencukupi`,
        );
      }

      const newQuantity = adjustment.currentStock - adjustment.totalQty;
      await tx.master_inventory_items.update({
        where: { id: adjustment.itemId },
        data: {
          stock_quantity: newQuantity,
          updated_at: timestamp,
        },
      });

      await tx.inventory_stock_adjustments.create({
        data: {
          master_inventory_items_id: adjustment.itemId,
          stores_id: storeId,
          action: StockAdjustmentActionDto.STOCK_OUT,
          adjustment_quantity: adjustment.totalQty,
          notes: `Pengurangan stok batch recipe ${recipeIdentifier}`,
          previous_quantity: adjustment.currentStock,
          new_quantity: newQuantity,
          created_by: createdBy,
          created_at: timestamp,
          updated_at: timestamp,
        },
      });
    }
  }

  private async addPortionStockForBatch(
    tx: Prisma.TransactionClient,
    params: {
      storeId: string;
      batchId: string;
      recipeId?: string | null;
      portionQty: number;
      userId: unknown;
    },
  ) {
    const { storeId, batchId, recipeId, portionQty, userId } = params;

    if (!recipeId) {
      return;
    }

    const quantity = Math.trunc(portionQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const menuRecipe = await tx.menu_recipes.findFirst({
      where: {
        recipe_id: recipeId,
        store_id: storeId,
      },
      select: {
        recipe_name: true,
        product_id: true,
      },
    });

    if (!menuRecipe?.product_id) {
      return;
    }

    const product = await tx.products.findFirst({
      where: {
        id: menuRecipe.product_id,
        stores_id: storeId,
      },
      select: {
        id: true,
        stock_quantity: true,
      },
    });

    if (!product) {
      return;
    }

    const previousQuantity = product.stock_quantity ?? 0;
    const newQuantity = previousQuantity + quantity;

    await tx.products.update({
      where: { id: product.id },
      data: { stock_quantity: newQuantity },
    });

    await tx.product_portion_stock.create({
      data: {
        product_id: product.id,
        stores_id: storeId,
        action: ProductPortionAction.INCREASE,
        adjustment_quantity: quantity,
        notes: `Penambahan stok dari batch recipe ${menuRecipe.recipe_name ?? batchId}`,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        created_by: this.normalizeUserId(userId),
      },
    });
  }

  private normalizeUserId(userId: unknown): number | null {
    if (typeof userId === 'number' && Number.isFinite(userId)) {
      return userId;
    }

    if (typeof userId === 'string' && userId.trim() !== '') {
      const parsed = Number(userId);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private getYieldRatio(
    batchTargetYield: number,
    recipeTargetYield: number | null,
  ) {
    if (!recipeTargetYield || recipeTargetYield <= 0) {
      return batchTargetYield;
    }

    return batchTargetYield / recipeTargetYield;
  }

  private calculatePortionStockIncrease(
    batchTargetYield: number | null | undefined,
    batchWaste: number | null | undefined,
  ) {
    const target = Number(batchTargetYield ?? 0);
    if (!Number.isFinite(target) || target <= 0) {
      return 0;
    }

    const wasteValue = Number(batchWaste ?? 0);
    const normalizedWaste = Number.isFinite(wasteValue)
      ? Math.max(0, wasteValue)
      : 0;

    const netYield = target - normalizedWaste;
    if (!Number.isFinite(netYield) || netYield <= 0) {
      return 0;
    }

    return Math.floor(netYield);
  }

  private async getBatchDetail(batchId: string, storeId: string) {
    const batch = await this.prisma.batch_cooking_recipe.findFirst({
      where: {
        id: batchId,
        store_id: storeId,
      },
      include: {
        menu_recipes: {
          select: {
            recipe_id: true,
            recipe_name: true,
            target_yield: true,
            output_unit: true,
            base_recipe: true,
            cost_portion: true,
            margin_per_selling_price_rp: true,
            margin_per_selling_price_percent: true,
            products: {
              select: {
                price: true,
              },
            },
          },
        },
        batch_cooking_recipe_ingredient: {
          include: {
            ingredients: {
              select: {
                master_inventory_items: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch recipe tidak ditemukan');
    }

    return this.formatBatch(batch);
  }

  private async getBatchOrThrow(batchId: string, storeId: string) {
    const batch = await this.prisma.batch_cooking_recipe.findFirst({
      where: {
        id: batchId,
        store_id: storeId,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch recipe tidak ditemukan');
    }

    return batch;
  }

  private async validateInventoryItemOwnership(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
    storeId: string,
  ) {
    const item = await tx.master_inventory_items.findFirst({
      where: {
        id: inventoryItemId,
        store_id: storeId,
      },
      select: { id: true },
    });

    if (!item) {
      throw new BadRequestException(
        `Inventory item dengan ID ${inventoryItemId} tidak ditemukan pada store ini`,
      );
    }
  }

  private async ensureStoreOwnedByOwner(storeId: string, ownerId: number) {
    const ownership = await this.prisma.user_has_stores.findFirst({
      where: {
        store_id: storeId,
        user_id: ownerId,
      },
      select: { id: true },
    });

    if (!ownership) {
      throw new BadRequestException(
        'Store tidak ditemukan atau bukan milik owner ini',
      );
    }
  }

  private formatBatch(batch: any) {
    const { menu_recipes, ...rest } = batch;
    const formatted: Record<string, any> = {
      ...rest,
      status: this.toStatusString(batch.status),
    };

    if (menu_recipes === undefined) {
      return formatted;
    }

    return {
      ...formatted,
      menu_recipes: this.transformMenuRecipe(menu_recipes),
    };
  }

  private transformMenuRecipe(menuRecipe: any) {
    if (menuRecipe) {
      const {
        base_recipe,
        cost_portion,
        margin_per_selling_price_rp,
        margin_per_selling_price_percent,
        products,
        ...rest
      } = menuRecipe;

      return {
        ...rest,
        isBaseRecipe: Boolean(base_recipe),
        costPerPortion: this.decimalToNumber(cost_portion),
        marginRp: this.decimalToNumber(margin_per_selling_price_rp),
        marginPercent: this.decimalToNumber(margin_per_selling_price_percent),
        productPrice: this.decimalToNumber(products?.price),
      };
    }

    return menuRecipe;
  }

  private buildIngredientEntries(
    ingredients: any[],
    ratio: number,
    timestamp: Date,
    recipeId: string,
  ) {
    let totalCost = 0;
    let hasCost = false;

    const entries = ingredients.map((ingredient) => {
      const baseQty =
        ingredient.qty?.toNumber?.() ?? Number(ingredient.qty ?? 0);

      const qtyNumber = Number.isFinite(baseQty) ? baseQty : 0;
      const ingredientCost = ingredient.cost
        ? ingredient.cost.toNumber()
        : null;
      const inventoryUnitPrice = ingredient.master_inventory_items
        ?.price_per_unit
        ? ingredient.master_inventory_items.price_per_unit.toNumber()
        : null;

      let baseUnitPrice: number | null = null;
      let baseCost: number | null = null;

      if (ingredientCost !== null) {
        baseCost = Number(ingredientCost.toFixed(4));
        if (qtyNumber > 0) {
          baseUnitPrice = Number((ingredientCost / qtyNumber).toFixed(4));
        } else if (inventoryUnitPrice !== null) {
          baseUnitPrice = Number(inventoryUnitPrice.toFixed(4));
        }
      } else if (inventoryUnitPrice !== null) {
        baseUnitPrice = Number(inventoryUnitPrice.toFixed(4));
        if (qtyNumber > 0) {
          baseCost = Number((inventoryUnitPrice * qtyNumber).toFixed(4));
        }
      }

      const scaledQty = Number((qtyNumber * ratio).toFixed(4));
      let scaledCost: number | null = null;
      if (typeof baseCost === 'number') {
        scaledCost = Number((baseCost * ratio).toFixed(4));
      } else if (typeof baseUnitPrice === 'number') {
        scaledCost =
          scaledQty > 0 ? Number((baseUnitPrice * scaledQty).toFixed(4)) : null;
      }

      if (typeof scaledCost === 'number') {
        totalCost += scaledCost;
        hasCost = true;
      }

      return {
        ingredient_id: ingredient.ingredient_id,
        recipe_id: ingredient.recipe_id ?? recipeId,
        qty: scaledQty,
        base_price: baseUnitPrice,
        cost: scaledCost,
        created_at: timestamp,
        updated_at: timestamp.toISOString(),
      };
    });

    const costBatch = hasCost ? Number(totalCost.toFixed(4)) : null;

    return { entries, costBatch };
  }

  private calculateCostPerPortion(
    costBatch: number | null,
    targetYield: number | null,
  ): number | null {
    if (
      costBatch === null ||
      costBatch === undefined ||
      !targetYield ||
      targetYield <= 0
    ) {
      return null;
    }

    return Number((costBatch / targetYield).toFixed(4));
  }

  private calculateMarginSellingPrice(
    productPrice: number | null,
    costPerPortion: number | null,
  ): number | null {
    if (
      productPrice === null ||
      productPrice === undefined ||
      costPerPortion === null ||
      costPerPortion === undefined
    ) {
      return null;
    }

    return Number((productPrice - costPerPortion).toFixed(4));
  }

  private decimalToNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    return value.toNumber();
  }

  private toStatusString(status: number | null): string | null {
    if (status === null || status === undefined) {
      return null;
    }

    return BatchRecipeStatus[status as BatchRecipeStatus] ?? null;
  }
}
