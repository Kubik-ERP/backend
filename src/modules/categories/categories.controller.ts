import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { ApiConsumes } from '@nestjs/swagger';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const relativePath = `/public/images/${file.filename}`;

    try {
      const newCategory = await this.categoriesService.create({
        ...createCategoryDto,
        image: relativePath,
      });

      return {
        statusCode: 201,
        message: 'Category created successfully',
        result: toCamelCase(newCategory),
      };
    } catch (error) {
      return {
        statusCode: error?.status || 500,
        message: error?.message || 'Failed to create category',
        result: null,
      };
    }
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.categoriesService.findAll({
        page,
        limit,
        search,
      });
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch categories',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':idOrName')
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const category = await this.categoriesService.findOne(idOrName);

      if (!category) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Category not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(category),
      };
    } catch (error) {
      console.error('Error finding category:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch category',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    try {
      const updatedCategory = await this.categoriesService.update(
        id,
        updateCategoryDto,
      );

      if (!updatedCategory) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Category not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Category updated successfully',
        result: toCamelCase(updatedCategory),
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update category',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deletedCategory = await this.categoriesService.remove(id);

      if (!deletedCategory) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Category not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Category deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete category',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
