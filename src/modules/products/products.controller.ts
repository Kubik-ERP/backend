import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuthPermissionGuard } from '../../common/guards/auth-permission.guard';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { StorageService } from '../storage-service/services/storage-service.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FindAllProductsQueryDto } from './dto/find-product.dto';
import { UpdateDiscountPriceDto } from './dto/update-discount-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PreviewImportProductsDto } from './dto/import-preview.dto';
import { ExecuteImportProductsDto } from './dto/execute-import.dto';
import { DeleteBatchProductsDto } from './dto/delete-batch.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
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
    @Req() req: ICustomRequestHeaders,
    @Body() createProductDto: CreateProductDto,
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
    const newProducts = await this.productsService.create(
      {
        ...createProductDto,
        image: relativePath || '',
      },
      req,
    );

    return {
      statusCode: 201,
      message: 'Products created successfully',
      result: toCamelCase(newProducts),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions(
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
    @Query() query: FindAllProductsQueryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const result = await this.productsService.findAll(
        {
          page: Number(query.page),
          limit: Number(query.limit),
          search: query.search,
          category_id: query.category_id ?? [],
        },
        req,
      );
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
  @Patch('discount-price')
  async updateDiscountPrice(
    @Body() updateDiscountPriceDto: UpdateDiscountPriceDto,
  ) {
    try {
      const updatedProducts =
        await this.productsService.bulkUpdateDiscountPrice(
          updateDiscountPriceDto,
        );
      return {
        statusCode: 200,
        message: 'Discount price updated successfully',
        result: toCamelCase(updatedProducts),
      };
    } catch (error) {
      return {
        statusCode: error.status || 500,
        message: error.message || 'Failed to update discount price',
      };
    }
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      if (file) {
        const result = await this.storageService.uploadImage(
          file.buffer,
          file.originalname,
        );

        updateProductDto.image = result.filename;
      }

      const updatedProduct = await this.productsService.update(
        id,
        updateProductDto,
      );

      return {
        statusCode: 200,
        message: 'Product updated successfully',
        result: toCamelCase(updatedProduct),
      };
    } catch (error) {
      return {
        statusCode: error.status || 500,
        message: error.message || 'Failed to update product',
      };
    }
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/template')
  @ApiOperation({ summary: 'Generate import template for products' })
  async generateImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer = await this.productsService.generateImportTemplate(req);

    const filename = `products_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(buffer);
  }

  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/preview-data')
  @ApiOperation({ summary: 'Preview import data from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file to import',
    type: PreviewImportProductsDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ICustomRequestHeaders,
    @Body('batchId') batchId?: string,
  ) {
    // Validate batch_id if provided
    if (
      batchId &&
      !batchId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
      throw new BadRequestException(
        'Invalid batch ID format. Must be a valid UUID v4',
      );
    }

    const result = await this.productsService.previewImport(file, req, batchId);
    return {
      message: 'Import preview processed successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/execute')
  @ApiOperation({
    summary: 'Execute import of products from temp table',
  })
  async executeImport(
    @Body() dto: ExecuteImportProductsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.productsService.executeImport(dto.batchId, req);
    return {
      message: 'Import executed successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiBearerAuth()
  @Delete('import/batch')
  @ApiOperation({
    summary: 'Delete import batch from temp table',
    description:
      'Delete all records in temp_import_products table for the specified batch_id',
  })
  @ApiBody({ type: DeleteBatchProductsDto })
  async deleteBatch(@Body() dto: DeleteBatchProductsDto) {
    const result = await this.productsService.deleteBatch(dto.batchId);
    return {
      message: 'Import batch deleted successfully',
      result: {
        success: true,
        message: `Successfully deleted ${result.deletedCount} records`,
        deletedCount: result.deletedCount,
      },
    };
  }
}
