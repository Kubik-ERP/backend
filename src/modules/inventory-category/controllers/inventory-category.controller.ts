import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InventoryCategoryService } from '../services/inventory-category.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
  GetInventoryCategoriesDto,
} from '../dtos';

@ApiTags('Inventory Categories')
@Controller('inventory-categories')
export class InventoryCategoryController {
  constructor(
    private readonly inventoryCategoryService: InventoryCategoryService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({ summary: 'Create new inventory category' })
  async create(
    @Body() dto: CreateInventoryCategoryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const category = await this.inventoryCategoryService.create(dto, req);
    return {
      message: 'Inventory category created successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({ summary: 'Get list of inventory categories' })
  async list(
    @Query() query: GetInventoryCategoriesDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const categories = await this.inventoryCategoryService.list(query, req);
    return {
      message: 'Inventory categories retrieved successfully',
      result: toCamelCase(categories),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get inventory category detail' })
  async detail(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const category = await this.inventoryCategoryService.detail(id, req);
    return {
      message: 'Inventory category retrieved successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({ summary: 'Update inventory category' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCategoryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const category = await this.inventoryCategoryService.update(id, dto, req);
    return {
      message: 'Inventory category updated successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory category' })
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    await this.inventoryCategoryService.remove(id, req);
    return {
      message: 'Inventory category deleted successfully',
    };
  }
}
