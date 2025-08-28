import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { StockOpnamesService } from './stock-opnames.service';
import { CreateStockOpnameDto } from './dto/create-stock-opname.dto';
import { UpdateStockOpnameDto } from './dto/update-stock-opname.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiHeader } from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { StockOpnamesListDto } from './dto/stock-opnames-list.dto';

@Controller('stock-opnames')
export class StockOpnamesController {
  constructor(private readonly stockOpnamesService: StockOpnamesService) {}

  @ApiOperation({ summary: 'Create stock opname' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post()
  async create(
    @Body() dto: CreateStockOpnameDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const newStockOpname = await this.stockOpnamesService.create(dto, req);

    return {
      statusCode: 201,
      message: 'Stock opname created successfully',
      result: toCamelCase(newStockOpname),
    };
  }

  @ApiOperation({ summary: 'Get all stock opnames' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: StockOpnamesListDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const stockOpnames = await this.stockOpnamesService.findAll(query, req);
      return {
        statusCode: 200,
        message: 'Stock opnames fetched successfully',
        result: toCamelCase(stockOpnames),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get stock opname by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Stock opname ID. use "new" for preview create',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      const stockOpname = await this.stockOpnamesService.findOne(id, req);
      return {
        statusCode: 200,
        message: 'Stock opname fetched successfully',
        result: toCamelCase(stockOpname),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Update stock opname' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStockOpnameDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const updatedStockOpname = await this.stockOpnamesService.update(
      id,
      dto,
      req,
    );

    return {
      statusCode: 200,
      message: 'Stock opname updated successfully',
      result: toCamelCase(updatedStockOpname),
    };
  }

  @ApiOperation({ summary: 'Cancel purchase order' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      await this.stockOpnamesService.remove(id, req);
      return {
        statusCode: 200,
        message: 'Stock opname deleted successfully',
        result: null,
      };
    } catch (error) {
      return {
        statusCode: error?.status || 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Verify stock opname' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_stock_opname')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/verify')
  async verify(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const result = await this.stockOpnamesService.verify(id, req);

    return {
      statusCode: 200,
      message: 'Stock opname verified successfully',
      result: toCamelCase(result),
    };
  }
}
