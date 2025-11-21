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

  async getRecipeVersions(recipeId: string, storeId: string): Promise<any> {
    try {
      // First check if recipe exists and belongs to store
      const recipe = await this._prisma.menu_recipes.findFirst({
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

      // Get all versions for this recipe
      const versions = await this._prisma.recipe_versions.findMany({
        where: {
          recipe_id: recipeId,
        },
        orderBy: {
          version_number: 'desc',
        },
        select: {
          version_id: true,
          version_number: true,
          created_at: true,
        },
      });

      const mapped = versions.map((version) => ({
        versionId: version.version_id,
        versionNumber: version.version_number,
        createdAt: this.formatDateTimeToDisplay(version.created_at),
      }));

      return { versions: mapped };
    } catch (error) {
      this.logger.error(`Error getting recipe versions: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get recipe versions');
    }
  }

  async getRecipeVersionDetail(
    recipeId: string,
    versionId: string,
    storeId: string,
  ): Promise<any> {
    try {
      // First check if recipe exists and belongs to store
      const recipe = await this._prisma.menu_recipes.findFirst({
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

      // Get version detail with ingredients
      const version = await this._prisma.recipe_versions.findFirst({
        where: {
          version_id: versionId,
          recipe_id: recipeId,
        },
        include: {
          ingredient_versions: {
            include: {
              master_inventory_items: {
                include: {
                  master_inventory_item_conversions: true,
                },
              },
            },
          },
        },
      });

      if (!version) {
        throw new NotFoundException(
          `Version with ID ${versionId} not found for this recipe`,
        );
      }

      return this.toPlainRecipeVersionWithIngredients(version);
    } catch (error) {
      this.logger.error(
        `Error getting recipe version detail: ${error.message}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get recipe version detail');
    }
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
          products: true,
          ingredients: {
            include: {
              master_inventory_items: {
                include: {
                  master_inventory_item_conversions: true,
                },
              },
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
        include: {
          ingredients: true,
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

      // Use transaction to update recipe, create version, and recreate ingredients
      const updatedRecipe = await this._prisma.$transaction(async (prisma) => {
        // Get current version number and increment
        const allVersions = await prisma.recipe_versions.findMany({
          where: { recipe_id: recipeId },
          select: { version_number: true },
        });

        this.logger.log(
          `All versions from database: ${JSON.stringify(allVersions.map((v) => v.version_number))}`,
        );

        // Sort versions properly (not just string sorting)
        const sortedVersions = allVersions
          .map((v) => v.version_number)
          .sort((a, b) => {
            const [aMajor, aMinor] = a.split('.').map(Number);
            const [bMajor, bMinor] = b.split('.').map(Number);

            if (aMajor !== bMajor) {
              return bMajor - aMajor; // Descending major
            }
            return bMinor - aMinor; // Descending minor
          });

        this.logger.log(`Sorted versions: ${JSON.stringify(sortedVersions)}`);

        const latestVersionNumber = sortedVersions[0] || '1.0';
        this.logger.log(`Latest version number: "${latestVersionNumber}"`);

        const newVersionNumber = this.incrementVersion(latestVersionNumber);
        this.logger.log(`Generated new version number: "${newVersionNumber}"`);

        // Create recipe version with current data before update
        const recipeVersion = await prisma.recipe_versions.create({
          data: {
            recipe_id: recipeId,
            version_number: newVersionNumber,
            recipe_name: existingRecipe.recipe_name,
            output_unit: existingRecipe.output_unit,
            base_recipe: existingRecipe.base_recipe,
            product_id: existingRecipe.product_id,
            target_yield: existingRecipe.target_yield,
            cost_portion: existingRecipe.cost_portion,
            margin_per_selling_price_rp:
              existingRecipe.margin_per_selling_price_rp,
            margin_per_selling_price_percent:
              existingRecipe.margin_per_selling_price_percent,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: null, // TODO: Get from header when user auth is available
          },
        });

        // Create ingredient versions for current ingredients
        if (
          existingRecipe.ingredients &&
          existingRecipe.ingredients.length > 0
        ) {
          // Ensure version_id is available before using it
          const versionId = recipeVersion.version_id;

          for (const ingredient of existingRecipe.ingredients) {
            try {
              const ingredientVersionData = {
                recipe_version_id: versionId,
                item_id: ingredient.item_id,
                qty: new Prisma.Decimal(ingredient.qty.toString()),
                uom: ingredient.uom,
                notes: ingredient.notes || null,
                cost: ingredient.cost
                  ? new Prisma.Decimal(ingredient.cost.toString())
                  : null,
                created_at: new Date(),
                updated_at: new Date(),
              };

              await prisma.ingredient_versions.create({
                data: ingredientVersionData,
              });
            } catch (ingredientError) {
              this.logger.error(
                `Error creating ingredient version for ingredient_id ${ingredient.ingredient_id}: ${ingredientError.message}`,
              );
              throw ingredientError;
            }
          }
        }

        // Update recipe with new data
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

      // Use transaction to delete all related data
      await this._prisma.$transaction(async (prisma) => {
        // Get all recipe versions for this recipe
        const recipeVersions = await prisma.recipe_versions.findMany({
          where: { recipe_id: recipeId },
          select: { version_id: true },
        });

        // Delete ingredient versions for all recipe versions
        if (recipeVersions.length > 0) {
          const versionIds = recipeVersions.map((v) => v.version_id);
          await prisma.ingredient_versions.deleteMany({
            where: {
              recipe_version_id: { in: versionIds },
            },
          });
        }

        // Delete recipe versions
        await prisma.recipe_versions.deleteMany({
          where: { recipe_id: recipeId },
        });

        // Delete ingredients
        await prisma.ingredients.deleteMany({
          where: { recipe_id: recipeId },
        });

        // Delete the recipe itself
        await prisma.menu_recipes.delete({
          where: { recipe_id: recipeId },
        });
      });

      this.logger.log(
        `Recipe deleted: ${recipe.recipe_name} with all related data`,
      );
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
    const toNumberSafe = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && typeof val.toNumber === 'function') {
        return val.toNumber();
      }
      // Prisma Decimal object (s, e, d)
      if (val.s !== undefined && Array.isArray(val.d)) {
        return Number(val.d.join('')) * Math.pow(10, val.e);
      }
      return Number(val) || 0;
    };
    return {
      recipe_id: recipe.recipe_id,
      recipe_name: recipe.recipe_name,
      output_unit: recipe.output_unit,
      base_recipe: recipe.base_recipe,
      product_id: recipe.product_id,
      target_yield: recipe.target_yield,
      cost_portion: toNumberSafe(recipe.cost_portion),
      margin_per_selling_price_rp: toNumberSafe(
        recipe.margin_per_selling_price_rp,
      ),
      margin_per_selling_price_percent: toNumberSafe(
        recipe.margin_per_selling_price_percent,
      ),
      store_id: recipe.store_id,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      products: recipe.products,
      ingredients: recipe.ingredients
        ? recipe.ingredients.map((ingredient: any) => {
            const item = ingredient.master_inventory_items;
            return {
              ingredient_id: ingredient.ingredient_id,
              item_id: ingredient.item_id,
              qty: toNumberSafe(ingredient.qty),
              uom: ingredient.uom,
              notes: ingredient.notes,
              cost: toNumberSafe(ingredient.cost),
              inventory_item: item
                ? {
                    ...item,
                    price_per_unit: toNumberSafe(item.price_per_unit),
                    price_grosir: toNumberSafe(item.price_grosir),
                    master_inventory_item_conversions:
                      item.master_inventory_item_conversions
                        ? item.master_inventory_item_conversions.map(
                            (conversion: any) => ({
                              ...conversion,
                              conversion_value: toNumberSafe(
                                conversion.conversion_value,
                              ),
                            }),
                          )
                        : [],
                  }
                : null,
            };
          })
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

  private incrementVersion(currentVersion: string): string {
    // Handle null, undefined, or empty string
    if (!currentVersion || currentVersion.trim() === '') {
      return '1.1';
    }

    const versionParts = currentVersion.split('.');

    // Ensure we have at least 2 parts
    if (versionParts.length < 2) {
      return '1.1';
    }

    const major = parseInt(versionParts[0], 10);
    const minor = parseInt(versionParts[1], 10);

    // Validate parsed numbers
    if (isNaN(major) || isNaN(minor)) {
      return '1.1';
    }

    const newMinor = minor + 1;
    const newVersion = `${major}.${newMinor}`;

    this.logger.log(`Incremented "${currentVersion}" to "${newVersion}"`);
    return newVersion;
  }

  private formatDateTimeToDisplay(date: Date | null): string {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
  }

  private toPlainRecipeVersionWithIngredients(version: any) {
    const toNumberSafe = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && typeof val.toNumber === 'function') {
        return val.toNumber();
      }
      // Prisma Decimal object (s, e, d)
      if (val.s !== undefined && Array.isArray(val.d)) {
        return Number(val.d.join('')) * Math.pow(10, val.e);
      }
      return Number(val) || 0;
    };
    return {
      version_id: version.version_id,
      recipe_id: version.recipe_id,
      version_number: version.version_number,
      recipe_name: version.recipe_name,
      output_unit: version.output_unit,
      base_recipe: version.base_recipe,
      product_id: version.product_id,
      target_yield: version.target_yield,
      cost_portion:
        version.cost_portion &&
        typeof version.cost_portion === 'object' &&
        typeof version.cost_portion.toNumber === 'function'
          ? version.cost_portion.toNumber()
          : version.cost_portion,
      margin_per_selling_price_rp:
        version.margin_per_selling_price_rp &&
        typeof version.margin_per_selling_price_rp === 'object' &&
        typeof version.margin_per_selling_price_rp.toNumber === 'function'
          ? version.margin_per_selling_price_rp.toNumber()
          : version.margin_per_selling_price_rp,
      margin_per_selling_price_percent:
        version.margin_per_selling_price_percent &&
        typeof version.margin_per_selling_price_percent === 'object' &&
        typeof version.margin_per_selling_price_percent.toNumber === 'function'
          ? version.margin_per_selling_price_percent.toNumber()
          : version.margin_per_selling_price_percent,
      created_at: version.created_at,
      updated_at: version.updated_at,
      created_by: version.created_by,
      ingredients: version.ingredient_versions
        ? version.ingredient_versions.map((ingredient: any) => {
            const item = ingredient.master_inventory_items;
            return {
              ingredient_version_id: ingredient.ingredient_version_id,
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
              inventory_item: item
                ? {
                    ...item,
                    price_per_unit: toNumberSafe(item.price_per_unit),
                    price_grosir: toNumberSafe(item.price_grosir),
                    margin: toNumberSafe(item.margin),
                    master_inventory_item_conversions:
                      item.master_inventory_item_conversions
                        ? item.master_inventory_item_conversions.map(
                            (conversion: any) => ({
                              ...conversion,
                              conversion_value: toNumberSafe(
                                conversion.conversion_value,
                              ),
                            }),
                          )
                        : [],
                  }
                : null,
            };
          })
        : [],
    };
  }
}
