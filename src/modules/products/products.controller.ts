import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpException,
  HttpStatus,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Query } from '@nestjs/common';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { FindAllProductsQueryDto } from './dto/find-product.dto';
import { ApiConsumes } from '@nestjs/swagger';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @Post()
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const relativePath = `/public/images/${file.filename}`;
      const newProducts = await this.productsService.create({
        ...createProductDto,
        image: relativePath,
      });

      return {
        statusCode: 201,
        message: 'Products created successfully',
        result: toCamelCase(newProducts),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Get()
  async findAll(@Query() query: FindAllProductsQueryDto) {
    try {
      const result = await this.productsService.findAll({
        page: Number(query.page),
        limit: Number(query.limit),
        search: query.search,
      });
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch products',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':idOrName')
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const products = await this.productsService.findOne(idOrName);
      if (!products) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'products not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(products),
      };
    } catch (error) {
      console.error('Error finding products:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch products',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    try {
      const result = await this.productsService.update(id, updateProductDto);
      return {
        statusCode: 200,
        message: 'Product updated successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      return {
        statusCode: error.status || 500,
        message: error.message || 'Failed to update product',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.productsService.remove(id);
      return {
        statusCode: 200,
        message: 'Product deleted successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      return {
        statusCode: error.status || 500,
        message: error.message || 'Failed to delete product',
      };
    }
  }
}
