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
  UseGuards,
  Req,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { StorageService } from '../storage-service/services/storage-service.service';
import { AuthPermissionGuard } from '../../common/guards/auth-permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_category')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @Post()
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: ICustomRequestHeaders,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let relativePath = '';
    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );
      relativePath = result.filename;
    }

    try {
      const newCategory = await this.categoriesService.create(
        {
          ...createCategoryDto,
          image: relativePath || '',
        },
        req,
      );

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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions(
    'product_category',
    'product_management',
    'process_unpaid_invoice',
    'check_out_sales',
  )
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Req() req: ICustomRequestHeaders,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.categoriesService.findAll(
        {
          page,
          limit,
          search,
        },
        req,
      );
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

  // @UseGuards(AuthPermissionGuard)
  // @RequirePermissions(
  //   'product_category',
  //   'product_management',
  //   'process_unpaid_invoice',
  //   'check_out_sales',
  // )
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('all')
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Retrieve all categories from the categories table with optional search by name',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search categories by name',
    type: String,
  })
  async findAllCategories(
    @Req() req: ICustomRequestHeaders,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.categoriesService.findAllCategories(
        search,
        req,
      );
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching all categories:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch categories',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @UseGuards(AuthPermissionGuard)
  // @RequirePermissions(
  //   'product_category',
  //   'product_management',
  //   'process_unpaid_invoice',
  //   'check_out_sales',
  // )
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('products')
  @ApiOperation({
    summary: 'Get catalog products',
    description:
      'Retrieve products from categories_has_products table related to products table',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search products by name',
    type: String,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
    type: String,
  })
  async findCatalogProducts(
    @Req() req: ICustomRequestHeaders,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    try {
      const result = await this.categoriesService.findCatalogProducts(
        search,
        categoryId,
        req,
      );
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching catalog products:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch catalog products',
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      if (file) {
        const result = await this.storageService.uploadImage(
          file.buffer,
          file.originalname,
        );

        updateCategoryDto.image = result.filename;
      }
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
