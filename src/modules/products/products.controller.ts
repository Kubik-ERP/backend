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
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      const newProducts = await this.productsService.create(createProductDto);
      return {
        statusCode: 201,
        message: 'Products created successfully',
        result: newProducts,
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
  async findAll() {
    try {
      const products = await this.productsService.findAll();
      return { statusCode: 200, message: 'Success', result: products };
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
      const products = await this.productsService.findOne(idOrName);
      if (!products) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'products not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { statusCode: 200, message: 'Success', result: products };
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
        result,
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
        result,
      };
    } catch (error) {
      return {
        statusCode: error.status || 500,
        message: error.message || 'Failed to delete product',
      };
    }
  }
}
