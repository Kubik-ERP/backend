import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateInventoryItemDto,
  GetInventoryItemsDto,
  UpdateInventoryItemDto,
} from '../dtos';
import { InventoryItemsService } from '../services/inventory-items.service';

@ApiTags('Inventory Items')
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({ summary: 'Create a new inventory item' })
  public async create(
    @Body() dto: CreateInventoryItemDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const item = await this.inventoryItemsService.create(dto, req);
    return {
      message: 'Inventory item successfully created',
      result: toCamelCase(item),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({ summary: 'Get list of inventory items' })
  public async list(
    @Query() query: GetInventoryItemsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryItemsService.list(query, req);
    return {
      message: 'Inventory items retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  public async detail(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const item = await this.inventoryItemsService.detail(id, req);
    return {
      message: 'Inventory item retrieved successfully',
      result: toCamelCase(item),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({ summary: 'Update inventory item by ID' })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const item = await this.inventoryItemsService.update(id, dto, req);
    return {
      message: 'Inventory item updated successfully',
      result: toCamelCase(item),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory item by ID' })
  public async remove(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    await this.inventoryItemsService.remove(id, req);
    return { message: 'Inventory item deleted successfully' };
  }
}
