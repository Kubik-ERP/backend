import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { categories as CategoryModel } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { validate as isUUID } from 'uuid';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCategoryDto: CreateCategoryDto & { image: string },
    header: ICustomRequestHeaders,
  ) {
    const { category, description, image } = createCategoryDto;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }
    const existingCategory = await this.prisma.categories.findFirst({
      where: {
        category: category,
        stores_id: store_id,
      },
    });

    if (existingCategory) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Category must be unique',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newCategory = await this.prisma.categories.create({
      data: {
        category,
        description,
        picture_url: image,
        stores_id: store_id,
      },
    });

    return newCategory;
  }

  async findAll(
    {
      page = 1,
      limit = 10,
      search = '',
    }: {
      page?: number;
      limit?: number;
      search?: string;
    },
    header: ICustomRequestHeaders,
  ) {
    const skip = (page - 1) * limit;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }
    const [storeCategories, total] = await Promise.all([
      this.prisma.categories.findMany({
        where: {
          stores_id: store_id,
          ...(search && {
            category: {
              contains: search,
              mode: 'insensitive',
            },
          }),
        },
        skip,
        take: limit,
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.categories.count({
        where: {
          stores_id: store_id,
          ...(search && {
            category: {
              contains: search,
              mode: 'insensitive',
            },
          }),
        },
      }),
    ]);
    return {
      data: storeCategories,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  public async findOne(idOrcategory: string): Promise<CategoryModel | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.categories.findUnique({
        where: { id: idOrcategory },
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      return await this.prisma.categories.findFirst({
        where: {
          category: { contains: idOrcategory, mode: 'insensitive' },
        },
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
  }

  public async findMany(
    idOrcategory: string,
  ): Promise<CategoryModel | CategoryModel[] | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.categories.findUnique({
        where: { id: idOrcategory },
      });
    } else {
      return await this.prisma.categories.findMany({
        where: {
          category: { contains: idOrcategory, mode: 'insensitive' },
        },
      });
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const existingCategory = await this.prisma.categories.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      if (updateCategoryDto.category) {
        const duplicateCategory = await this.prisma.categories.findFirst({
          where: { category: updateCategoryDto.category, NOT: { id } },
        });

        if (duplicateCategory) {
          throw new BadRequestException('Category category must be unique');
        }
      }

      const updatedCategory = await this.prisma.categories.update({
        where: { id },
        data: {
          category: updateCategoryDto.category || existingCategory.category,
          description:
            updateCategoryDto.description || existingCategory.description,
          picture_url: updateCategoryDto.image,
        },
      });

      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message || 'Failed to update category');
    }
  }

  async remove(id: string) {
    try {
      const existingCategory = await this.prisma.categories.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      await this.prisma.categories.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  async findAllCategories(search?: string, header?: ICustomRequestHeaders) {
    const store_id = header?.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const categories = await this.prisma.categories.findMany({
      where: {
        stores_id: store_id,
        ...(search && {
          category: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      include: {
        categories_has_products: {
          include: {
            products: true,
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Transform the data to match the required format
    const transformedCategories = categories.map((category) => ({
      id: category.id,
      category: category.category,
      description: category.description,
      pictureUrl: category.picture_url,
      totalItems: category.categories_has_products.length,
    }));

    return transformedCategories;
  }

  async findCatalogProducts(
    search?: string,
    categoryId?: string,
    header?: ICustomRequestHeaders,
  ) {
    const store_id = header?.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // Get categories with their products
    const categories = await this.prisma.categories.findMany({
      where: {
        stores_id: store_id,
        ...(categoryId && {
          id: categoryId,
        }),
      },
      include: {
        categories_has_products: {
          where: {
            ...(search && {
              products: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            }),
          },
          include: {
            products: {
              include: {
                variant_has_products: {
                  include: {
                    variant: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Transform the data to match the required format
    const transformedData = categories.map((category) => ({
      id: category.id,
      category: category.category,
      description: category.description,
      items: category.categories_has_products.map((categoryProduct) => ({
        id: categoryProduct.products.id,
        name: categoryProduct.products.name,
        price: categoryProduct.products.price,
        discountPrice: categoryProduct.products.discount_price,
        pictureUrl: categoryProduct.products.picture_url,
        isPercent: categoryProduct.products.is_percent,
        variant: categoryProduct.products.variant_has_products.map(
          (variantProduct) => ({
            id: variantProduct.variant.id,
            productsId: variantProduct.products_id,
            name: variantProduct.variant.name,
            price: variantProduct.variant.price,
          }),
        ),
      })),
    }));

    // Filter out categories with no items if search is applied
    return transformedData.filter(
      (category) => !search || category.items.length > 0,
    );
  }
}
