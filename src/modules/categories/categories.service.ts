import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { categories as CategoryModel } from '@prisma/client';
import { validate as isUUID } from 'uuid';
import { error } from 'console';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto & { image: string }) {
    const { category, description, image } = createCategoryDto;

    const existingCategory = await this.prisma.categories.findFirst({
      where: { category },
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
      },
    });

    return newCategory;
  }

  async findAll({
    page = 1,
    limit = 10,
    search = '',
    categories = '',
  }: {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string;
  }) {
    const skip = (page - 1) * limit;

    const categoryIds = categories
      ? categories.split('#').filter((id) => id.trim() !== '')
      : [];

    let whereCondition: any = {};

    if (categoryIds.length > 0) {
      whereCondition = {
        id: { in: categoryIds },
      };
    } else if (search) {
      whereCondition = {
        category: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const [categoriesResult, total] = await Promise.all([
      this.prisma.categories.findMany({
        where: whereCondition,
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
        where: whereCondition,
      }),
    ]);

    return {
      categories: categoriesResult,
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
}
