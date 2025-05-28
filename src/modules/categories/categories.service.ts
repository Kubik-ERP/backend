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

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const existingCategory = await this.prisma.categories.findFirst({
        where: { category: createCategoryDto.category },
      });

      if (existingCategory) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Category category must be unique',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const newCategory = await this.prisma.categories.create({
        data: {
          category: createCategoryDto.category,
          description: createCategoryDto.description,
        },
      });

      return newCategory;
    } catch (error) {
      throw new Error(error.message || 'Failed to create category');
    }
  }

  public async findAll(): Promise<CategoryModel[]> {
    const categories = await this.prisma.categories.findMany();
    return categories;
  }

  public async findOne(idOrcategory: string): Promise<CategoryModel | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.categories.findUnique({
        where: { id: idOrcategory },
      });
    } else {
      return await this.prisma.categories.findFirst({
        where: {
          category: { contains: idOrcategory, mode: 'insensitive' },
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
          description: updateCategoryDto.description || existingCategory.description,
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
