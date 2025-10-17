import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRecipeDto } from '../dtos/create-recipe.dto';
import { IngredientDto } from '../dtos/ingredient.dto';
import { UpdateRecipeDto } from '../dtos/update-recipe.dto';
import { GetRecipesDto } from '../dtos/list-recipes.dto';

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
            cost_portion: dto.costPortion || null,
            margin_per_selling_price_rp: dto.marginPerSellingPriceRp || null,
            margin_per_selling_price_percent:
              dto.marginPerSellingPricePercent || null,
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

  async list(query: GetRecipesDto, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const {
      page = 1,
      pageSize = 10,
      search,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      store_id: store_id,
    };

    if (search) {
      where.recipe_name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [recipes, total] = await Promise.all([
      this._prisma.menu_recipes.findMany({
        where,
        select: {
          recipe_id: true,
          recipe_name: true,
          output_unit: true,
          base_recipe: true,
          target_yield: true,
          cost_portion: true,
          margin_per_selling_price_rp: true,
          margin_per_selling_price_percent: true,
          updated_at: true,
        },
        orderBy: { [orderBy]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.menu_recipes.count({ where }),
    ]);

    const mapped = recipes.map((recipe) => ({
      id: recipe.recipe_id,
      isBaseRecipe: recipe.base_recipe || false,
      recipeName: recipe.recipe_name,
      output: recipe.output_unit || '',
      yieldTarget: recipe.target_yield || 0,
      costPerPortion:
        recipe.cost_portion &&
        typeof recipe.cost_portion === 'object' &&
        typeof recipe.cost_portion.toNumber === 'function'
          ? recipe.cost_portion.toNumber()
          : recipe.cost_portion || 0,
      marginRp:
        recipe.margin_per_selling_price_rp &&
        typeof recipe.margin_per_selling_price_rp === 'object' &&
        typeof recipe.margin_per_selling_price_rp.toNumber === 'function'
          ? recipe.margin_per_selling_price_rp.toNumber()
          : recipe.margin_per_selling_price_rp || 0,
      marginPercent:
        recipe.margin_per_selling_price_percent &&
        typeof recipe.margin_per_selling_price_percent === 'object' &&
        typeof recipe.margin_per_selling_price_percent.toNumber === 'function'
          ? recipe.margin_per_selling_price_percent.toNumber()
          : recipe.margin_per_selling_price_percent || 0,
      updatedAt: this.formatDateToDDMMYYYY(recipe.updated_at),
    }));

    const totalPages = Math.ceil(total / pageSize);
    return { items: mapped, meta: { page, pageSize, total, totalPages } };
  }

  async findRecipeById(recipeId: string, storeId: string): Promise<any> {
    try {
      this.logger.log(
        `Finding recipe with ID: ${recipeId} for store: ${storeId}`,
      );

      const recipe = await this._prisma.menu_recipes.findFirst({
        where: {
          recipe_id: recipeId,
          store_id: storeId,
        },
        include: {
          ingredients: {
            include: {
              master_inventory_items: true,
            },
          },
        },
      });

      if (!recipe) {
        this.logger.warn(
          `Recipe with ID ${recipeId} not found in store ${storeId}`,
        );
        throw new NotFoundException(
          `Recipe with ID ${recipeId} not found in this store`,
        );
      }

      this.logger.log(
        `Recipe found: ${recipe.recipe_name} with ${recipe.ingredients?.length || 0} ingredients`,
      );

      const result = this.toPlainRecipeWithIngredients(recipe);
      this.logger.log(`Returning recipe data:`, result);

      return result;
    } catch (error) {
      this.logger.error(`Error finding recipe: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to find recipe');
    }
  }

  async updateRecipe(
    recipeId: string,
    updateData: UpdateRecipeDto,
    storeId: string,
  ): Promise<any> {
    try {
      // First check if recipe exists and belongs to store
      const existingRecipe = await this._prisma.menu_recipes.findUnique({
        where: {
          recipe_id: recipeId,
          store_id: storeId,
        },
      });

      if (!existingRecipe) {
        throw new NotFoundException(
          `Recipe with ID ${recipeId} not found in this store`,
        );
      }

      // Validate product_id if provided
      if (updateData.productId) {
        const product = await this._prisma.products.findUnique({
          where: {
            id: updateData.productId,
            stores_id: storeId,
          },
        });

        if (!product) {
          throw new BadRequestException(
            'Product not found or does not belong to this store',
          );
        }
      }

      // Use transaction to update recipe and recreate ingredients
      const updatedRecipe = await this._prisma.$transaction(async (prisma) => {
        // Update recipe
        const recipe = await prisma.menu_recipes.update({
          where: {
            recipe_id: recipeId,
          },
          data: {
            recipe_name: updateData.recipeName,
            output_unit: updateData.outputUnit,
            base_recipe: updateData.baseRecipe,
            product_id: updateData.productId,
            target_yield: updateData.targetYield,
            cost_portion: updateData.costPortion,
            margin_per_selling_price_rp: updateData.marginPerSellingPriceRp,
            margin_per_selling_price_percent:
              updateData.marginPerSellingPricePercent,
            updated_at: new Date(),
          },
        });

        // Delete existing ingredients if new ones are provided
        if (updateData.ingredients && updateData.ingredients.length > 0) {
          await prisma.ingredients.deleteMany({
            where: {
              recipe_id: recipeId,
            },
          });

          // Create new ingredients
          for (const ingredient of updateData.ingredients) {
            // Validate inventory item exists and belongs to store
            const inventoryItem =
              await prisma.master_inventory_items.findUnique({
                where: {
                  id: ingredient.itemId,
                  store_id: storeId,
                },
              });

            if (!inventoryItem) {
              throw new BadRequestException(
                `Inventory item with ID ${ingredient.itemId} not found or does not belong to this store`,
              );
            }

            await prisma.ingredients.create({
              data: {
                recipe_id: recipeId,
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

        return recipe;
      });

      this.logger.log(`Recipe updated: ${updatedRecipe.recipe_name}`);
      return this.toPlainRecipe(updatedRecipe);
    } catch (error) {
      this.logger.error(`Error updating recipe: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update recipe');
    }
  }

  async deleteRecipe(recipeId: string, storeId: string): Promise<void> {
    try {
      // Check if recipe exists and belongs to store
      const recipe = await this._prisma.menu_recipes.findUnique({
        where: {
          recipe_id: recipeId,
          store_id: storeId,
        },
      });

      if (!recipe) {
        throw new NotFoundException(
          `Recipe with ID ${recipeId} not found in this store`,
        );
      }

      // Delete recipe (ingredients will be deleted automatically due to cascade)
      await this._prisma.menu_recipes.delete({
        where: {
          recipe_id: recipeId,
        },
      });

      this.logger.log(`Recipe deleted: ${recipe.recipe_name}`);
    } catch (error) {
      this.logger.error(`Error deleting recipe: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete recipe');
    }
  }

  private toPlainRecipe(recipe: any) {
    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      output_unit: recipe.output_unit,
      base_recipe: recipe.base_recipe,
      product_id: recipe.product_id,
      target_yield: recipe.target_yield,
      cost_portion:
        recipe.cost_portion &&
        typeof recipe.cost_portion === 'object' &&
        typeof recipe.cost_portion.toNumber === 'function'
          ? recipe.cost_portion.toNumber()
          : recipe.cost_portion,
      margin_per_selling_price_rp:
        recipe.margin_per_selling_price_rp &&
        typeof recipe.margin_per_selling_price_rp === 'object' &&
        typeof recipe.margin_per_selling_price_rp.toNumber === 'function'
          ? recipe.margin_per_selling_price_rp.toNumber()
          : recipe.margin_per_selling_price_rp,
      margin_per_selling_price_percent:
        recipe.margin_per_selling_price_percent &&
        typeof recipe.margin_per_selling_price_percent === 'object' &&
        typeof recipe.margin_per_selling_price_percent.toNumber === 'function'
          ? recipe.margin_per_selling_price_percent.toNumber()
          : recipe.margin_per_selling_price_percent,
      store_id: recipe.store_id,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    };
  }

  private toPlainRecipeWithIngredients(recipe: any) {
    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      output_unit: recipe.output_unit,
      base_recipe: recipe.base_recipe,
      product_id: recipe.product_id,
      target_yield: recipe.target_yield,
      cost_portion:
        recipe.cost_portion &&
        typeof recipe.cost_portion === 'object' &&
        typeof recipe.cost_portion.toNumber === 'function'
          ? recipe.cost_portion.toNumber()
          : recipe.cost_portion,
      margin_per_selling_price_rp:
        recipe.margin_per_selling_price_rp &&
        typeof recipe.margin_per_selling_price_rp === 'object' &&
        typeof recipe.margin_per_selling_price_rp.toNumber === 'function'
          ? recipe.margin_per_selling_price_rp.toNumber()
          : recipe.margin_per_selling_price_rp,
      margin_per_selling_price_percent:
        recipe.margin_per_selling_price_percent &&
        typeof recipe.margin_per_selling_price_percent === 'object' &&
        typeof recipe.margin_per_selling_price_percent.toNumber === 'function'
          ? recipe.margin_per_selling_price_percent.toNumber()
          : recipe.margin_per_selling_price_percent,
      store_id: recipe.store_id,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      ingredients: recipe.ingredients
        ? recipe.ingredients.map((ingredient: any) => ({
            ingredient_id: ingredient.ingredient_id,
            item_id: ingredient.item_id,
            qty:
              ingredient.qty &&
              typeof ingredient.qty === 'object' &&
              typeof ingredient.qty.toNumber === 'function'
                ? ingredient.qty.toNumber()
                : ingredient.qty,
            uom: ingredient.uom,
            notes: ingredient.notes,
            cost:
              ingredient.cost &&
              typeof ingredient.cost === 'object' &&
              typeof ingredient.cost.toNumber === 'function'
                ? ingredient.cost.toNumber()
                : ingredient.cost,
            inventory_item: ingredient.master_inventory_items
              ? {
                  id: ingredient.master_inventory_items.id,
                  item_name: ingredient.master_inventory_items.item_name,
                  brand: ingredient.master_inventory_items.brand,
                  uom: ingredient.master_inventory_items.uom,
                }
              : null,
          }))
        : [],
    };
  }

  private formatDateToDDMMYYYY(date: Date | null): string {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
