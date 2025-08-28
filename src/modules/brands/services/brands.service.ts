import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto } from '../dtos/create-brand.dto';
import { UpdateBrandDto } from '../dtos/update-brand.dto';
import { GetBrandsDto } from '../dtos/get-brands.dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * @description Create a new brand
   */
  /**
   * Generate brand code based on brand name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateBrandCode(
    brandName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from brand name
      const words = brandName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingBrands = await this._prisma.master_brands.findMany({
        where: {
          code: {
            startsWith: prefix,
          },
          stores_has_master_brands: {
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
      existingBrands.forEach((brand) => {
        const numberPart = brand.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate brand code: ${error.message}`);
      throw new BadRequestException('Failed to generate brand code');
    }
  }

  /**
   * Validate duplicate brand code within a store
   */
  private async validateDuplicateBrandCode(
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
      whereCondition.stores_has_master_brands = {
        some: {
          stores_id: storeId,
        },
      };
    }

    const existingBrand = await this._prisma.master_brands.findFirst({
      where: whereCondition,
    });

    if (existingBrand) {
      throw new BadRequestException(`Brand code '${code}' already exists`);
    }
  }

  public async createBrand(
    createBrandDto: CreateBrandDto,
    header: ICustomRequestHeaders,
  ) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Validate for duplicate brand within the store
      await this.validateDuplicateBrand(
        createBrandDto.brandName,
        undefined,
        store_id,
      );

      // Generate code if not provided
      const brandCode =
        createBrandDto.code ||
        (await this.generateBrandCode(createBrandDto.brandName, store_id));

      // Validate for duplicate code within the store
      await this.validateDuplicateBrandCode(brandCode, undefined, store_id);

      const brand = await this._prisma.master_brands.create({
        data: {
          brand_name: createBrandDto.brandName,
          code: brandCode,
          notes: createBrandDto.notes,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create relationship with store
      await this._prisma.stores_has_master_brands.create({
        data: {
          stores_id: store_id,
          master_brands_id: brand.id,
        },
      });

      this.logger.log(
        `Brand created successfully: ${brand.brand_name} with code: ${brand.code}`,
      );
      return brand;
    } catch (error) {
      this.logger.error(`Failed to create brand: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create brand');
    }
  }

  /**
   * @description Get all brands with filtering and pagination
   */
  public async getBrands(
    getBrandsDto: GetBrandsDto,
    header: ICustomRequestHeaders,
  ) {
    try {
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
      } = getBrandsDto;

      const skip = (page - 1) * pageSize;

      // Build where condition
      const whereCondition: any = {
        stores_has_master_brands: {
          some: {
            stores_id: store_id,
          },
        },
      };

      if (search) {
        whereCondition.OR = [
          {
            brand_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Get brands with count
      const [brands, total] = await Promise.all([
        this._prisma.master_brands.findMany({
          where: whereCondition,
          orderBy: {
            [orderBy]: orderDirection,
          },
          skip,
          take: pageSize,
        }),
        this._prisma.master_brands.count({
          where: whereCondition,
        }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        items: brands,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get brands: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get brands');
    }
  }

  /**
   * @description Get brand by ID
   */
  public async getBrandById(id: string, header: ICustomRequestHeaders) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const brand = await this._prisma.master_brands.findFirst({
        where: {
          id,
          stores_has_master_brands: {
            some: {
              stores_id: store_id,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return brand;
    } catch (error) {
      this.logger.error(`Failed to get brand by ID: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to get brand');
    }
  }

  /**
   * @description Update brand by ID
   */
  public async updateBrand(
    id: string,
    updateBrandDto: UpdateBrandDto,
    header: ICustomRequestHeaders,
  ) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if brand exists and belongs to the store
      const existingBrand = await this.getBrandById(id, header);

      // Validate for duplicate brand name if it's being updated
      if (
        updateBrandDto.brandName &&
        updateBrandDto.brandName !== existingBrand.brand_name
      ) {
        await this.validateDuplicateBrand(
          updateBrandDto.brandName,
          id,
          store_id,
        );
      }

      // Validate for duplicate brand code if it's being updated
      if (updateBrandDto.code && updateBrandDto.code !== existingBrand.code) {
        await this.validateDuplicateBrandCode(
          updateBrandDto.code,
          id,
          store_id,
        );
      }

      const updatedBrand = await this._prisma.master_brands.update({
        where: { id },
        data: {
          ...(updateBrandDto.brandName && {
            brand_name: updateBrandDto.brandName,
          }),
          ...(updateBrandDto.code && {
            code: updateBrandDto.code,
          }),
          ...(updateBrandDto.notes !== undefined && {
            notes: updateBrandDto.notes,
          }),
          updated_at: new Date(),
        },
      });

      this.logger.log(`Brand updated successfully: ${updatedBrand.brand_name}`);
      return updatedBrand;
    } catch (error) {
      this.logger.error(`Failed to update brand: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update brand');
    }
  }

  /**
   * @description Delete brand by ID
   */
  public async deleteBrand(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if brand exists and belongs to the store
      const existingBrand = await this.getBrandById(id, header);

      // Prevent delete if brand is linked to any inventory item in this store
      const linkedItemsCount = await this._prisma.master_inventory_items.count({
        where: {
          brand_id: id,
          stores_has_master_inventory_items: { some: { stores_id: store_id } },
        },
      });
      if (linkedItemsCount > 0) {
        throw new BadRequestException(
          'Brand cannot be deleted because it is linked to one or more inventory items in this store',
        );
      }

      // Delete the store-brand relationship first
      await this._prisma.stores_has_master_brands.deleteMany({
        where: {
          master_brands_id: id,
          stores_id: store_id,
        },
      });
      const otherStoreRelations =
        await this._prisma.stores_has_master_brands.count({
          where: {
            master_brands_id: id,
          },
        });

      if (otherStoreRelations === 0) {
        await this._prisma.master_brands.delete({
          where: { id },
        });
      }

      this.logger.log(
        `Brand deleted successfully: ${existingBrand.brand_name}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete brand: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete brand');
    }
  }

  /**
   * @description Validate duplicate brand within a store
   */
  private async validateDuplicateBrand(
    brandName: string,
    excludeId?: string,
    storeId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      brand_name: {
        equals: brandName,
        mode: 'insensitive',
      },
    };

    if (excludeId) {
      whereCondition.id = {
        not: excludeId,
      };
    }

    if (storeId) {
      whereCondition.stores_has_master_brands = {
        some: {
          stores_id: storeId,
        },
      };
    }

    const existingBrand = await this._prisma.master_brands.findFirst({
      where: whereCondition,
    });

    if (existingBrand) {
      throw new BadRequestException(
        `Brand with name '${brandName}' already exists in this store`,
      );
    }
  }
}
