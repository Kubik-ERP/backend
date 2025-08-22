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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { CreateProductBundlingDto } from './dto/create-product-bundling.dto';
import { QueryProductBundling } from './dto/query-product-bundling.dto';
import { UpdateProductBundlingDto } from './dto/update-product-bundling.dto';
import { ProductBundlingService } from './product-bundling.service';

@Controller('product-bundling')
export class ProductBundlingController {
  constructor(
    private readonly productBundlingService: ProductBundlingService,
  ) {}

  @ApiOperation({ summary: 'Create Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  async create(
    @Body() createProductBundlingDto: CreateProductBundlingDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.productBundlingService.create(
      createProductBundlingDto,
      req,
    );
    return {
      message: 'Product bundling successfully created',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Get Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
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
  @UseGuards(AuthenticationJWTGuard)
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
  @UseGuards(AuthenticationJWTGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductBundlingDto: UpdateProductBundlingDto,
  ) {
    const data = await this.productBundlingService.update(
      id,
      updateProductBundlingDto,
    );
    return {
      message: 'Product bundling successfully updated',
      result: data,
    };
  }

  @ApiOperation({ summary: 'Delete Product Bundling' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.productBundlingService.remove(id);
    return {
      message: 'Product bundling successfully removed',
      result: data,
    };
  }
}
