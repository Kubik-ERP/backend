import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  Put,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiHeader } from '@nestjs/swagger';
import { UpdatePurchaseOrdersDto } from './dto/update-purchase-orders.dto';
import { ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { PurchaseOrdersListDto } from './dto/purchase-orders-list.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';

@Controller('purchase-order')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrderService: PurchaseOrdersService) {}

  @ApiOperation({ summary: 'Get all purchase orders' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: PurchaseOrdersListDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const purchaseOrders = await this.purchaseOrderService.findAll(
        query,
        req,
      );
      return {
        statusCode: 200,
        message: 'Purchase orders fetched successfully',
        result: toCamelCase(purchaseOrders),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get purchase order by id' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      const purchaseOrder = await this.purchaseOrderService.findOne(id, req);
      return {
        statusCode: 200,
        message: 'Purchase order fetched successfully',
        result: toCamelCase(purchaseOrder),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Create purchase order' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post()
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() createPurchaseOrderDto: CreatePurchaseOrdersDto,
  ) {
    const newPurchaseOrder = await this.purchaseOrderService.create(
      createPurchaseOrderDto,
      req,
    );

    return {
      statusCode: 201,
      message: 'Purchase order created successfully',
      result: toCamelCase(newPurchaseOrder),
    };
  }

  @ApiOperation({ summary: 'Update purchase order' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrdersDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const updatedPurchaseOrder = await this.purchaseOrderService.update(
      id,
      updatePurchaseOrderDto,
      req,
    );

    return {
      statusCode: 200,
      message: 'Purchase order updated successfully',
      result: toCamelCase(updatedPurchaseOrder),
    };
  }

  @ApiOperation({ summary: 'Cancel purchase order' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() cancelPurchaseOrderDto: CancelPurchaseOrderDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const cancelledPurchaseOrder = await this.purchaseOrderService.cancel(
      id,
      cancelPurchaseOrderDto,
      req,
    );

    return {
      statusCode: 200,
      message: 'Purchase order cancelled successfully',
      result: toCamelCase(cancelledPurchaseOrder),
    };
  }
}
