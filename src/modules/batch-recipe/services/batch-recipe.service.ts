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
import { BatchRecipeStatus } from '../interfaces/batch-recipe.interface';

@Injectable()
export class BatchRecipeService {
  constructor(private readonly prisma: PrismaService) {}

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
          cost_batch: null,
          cost_portion: null,
          margin_selling_price: null,
          store_id: storeId,
        },
      });

      const ingredientPayload = recipe.ingredients.map((ingredient) => {
        const baseQty = ingredient.qty?.toNumber?.() ?? Number(ingredient.qty);

        let baseCost: number | null = null;
        if (ingredient.cost) {
          baseCost = ingredient.cost.toNumber();
        } else if (ingredient.master_inventory_items?.price_per_unit) {
          baseCost =
            ingredient.master_inventory_items.price_per_unit.toNumber();
        }

        const scaledQty = baseQty * ratio;
        const scaledCost =
          typeof baseCost === 'number'
            ? Number((baseCost * ratio).toFixed(4))
            : null;

        return {
          batch_id: batch.id,
          ingredient_id: ingredient.ingredient_id,
          recipe_id: ingredient.recipe_id ?? recipe.recipe_id,
          qty: Number(scaledQty.toFixed(4)),
          base_price:
            typeof baseCost === 'number' ? Number(baseCost.toFixed(4)) : null,
          cost: scaledCost,
          created_at: now,
          updated_at: now.toISOString(),
        };
      });

      await tx.batch_cooking_recipe_ingredient.createMany({
        data: ingredientPayload,
      });

      return batch;
    });

    return this.getBatchDetail(createdBatch.id, storeId);
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

    await this.prisma.batch_cooking_recipe.update({
      where: { id: batch.id },
      data: {
        status: BatchRecipeStatus.COOKING,
        cooking_at: new Date(),
        updated_at: new Date(),
        updated_by: user.id,
      },
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

    await this.prisma.$transaction(async (tx) => {
      await tx.batch_cooking_recipe.update({
        where: { id: batch.id },
        data: {
          status: BatchRecipeStatus.COMPLETED,
          batch_waste: dto.batchWaste ?? batch.batch_waste ?? 0,
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
    });

    return this.getBatchDetail(batchId, storeId);
  }

  private getYieldRatio(
    batchTargetYield: number,
    recipeTargetYield: number | null,
  ) {
    if (!recipeTargetYield || recipeTargetYield <= 0) {
      return 1;
    }

    return batchTargetYield / recipeTargetYield;
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

    return batch;
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
}
