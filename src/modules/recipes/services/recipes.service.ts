import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRecipeDto } from '../dtos/create-recipe.dto';
import { IngredientDto } from '../dtos/ingredient.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async create(dto: CreateRecipeDto, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const recipe = await this._prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Validate product exists and belongs to store if productId is provided
        if (dto.productId) {
          const product = await tx.products.findFirst({
            where: {
              id: dto.productId,
              stores_id: store_id,
            },
          });

          if (!product) {
            throw new BadRequestException(
              `Product with ID ${dto.productId} not found or doesn't belong to this store.`,
            );
          }
        }

        // Create the recipe
        const createdRecipe = await tx.menu_recipes.create({
          data: {
            recipe_name: dto.recipeName,
            output_unit: dto.outputUnit || null,
            base_recipe: dto.baseRecipe || false,
            product_id: dto.productId || null,
            target_yield: dto.targetYield || null,
            store_id: store_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Create ingredients if provided
        if (dto.ingredients && dto.ingredients.length > 0) {
          for (const ingredient of dto.ingredients) {
            // Validate that item exists and belongs to the store
            const inventoryItem = await tx.master_inventory_items.findFirst({
              where: {
                id: ingredient.itemId,
                store_id: store_id,
              },
            });

            if (!inventoryItem) {
              throw new BadRequestException(
                `Inventory item with ID ${ingredient.itemId} not found or doesn't belong to this store.`,
              );
            }

            await tx.ingredients.create({
              data: {
                recipe_id: createdRecipe.recipe_id,
                item_id: ingredient.itemId,
                qty: ingredient.qty,
                uom: ingredient.uom,
                notes: ingredient.notes || null,
                cost: ingredient.cost || null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }
        }

        return createdRecipe;
      },
    );

    this.logger.log(`Recipe created: ${recipe.recipe_name}`);
    return this.toPlainRecipe(recipe);
  }

  private toPlainRecipe(recipe: any) {
    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      output_unit: recipe.output_unit,
      base_recipe: recipe.base_recipe,
      product_id: recipe.product_id,
      target_yield: recipe.target_yield,
      store_id: recipe.store_id,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };
  }
}
