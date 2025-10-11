import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { CreateProductBundlingDto } from './dto/create-product-bundling.dto';
import { QueryProductBundling } from './dto/query-product-bundling.dto';
import { UpdateProductBundlingDto } from './dto/update-product-bundling.dto';
import { ProductBundlingService } from './product-bundling.service';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { StorageService } from '../storage-service/services/storage-service.service';

@Controller('product-bundling')
export class ProductBundlingController {
  constructor(
    private readonly productBundlingService: ProductBundlingService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Create Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @Post()
  async create(
    @Body() createProductBundlingDto: CreateProductBundlingDto,
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
    const data = await this.productBundlingService.create(
      {
        ...createProductBundlingDto,
        image: relativePath || '',
      },
      req,
    );
    return {
      message: 'Product bundling successfully created',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Get Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  async findAll(
    @Query() query: QueryProductBundling,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.productBundlingService.findAll(query, req);
    return {
      message: 'Product bundling successfully retrieved',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Detail Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productBundlingService.findOne(id);
    return {
      message: 'Product bundling successfully retrieved',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Update Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateProductBundlingDto: UpdateProductBundlingDto,
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
    const data = await this.productBundlingService.update(id, {
      ...updateProductBundlingDto,
      image: relativePath || '',
    });
    return {
      message: 'Product bundling successfully updated',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Delete Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('product_management')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.productBundlingService.remove(id);
    return {
      message: 'Product bundling successfully removed',
      result: data,
    };
  }
}
