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
  HttpStatus,
  Res,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrdersDto } from './dto/create-purchase-orders.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiHeader } from '@nestjs/swagger';
import { UpdatePurchaseOrdersDto } from './dto/update-purchase-orders.dto';
import { ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PurchaseOrdersListDto } from './dto/purchase-orders-list.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { ConfirmPurchaseOrderDto } from './dto/confirm-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { Response } from 'express';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrderService: PurchaseOrdersService) {}

  @ApiOperation({ summary: 'Get all purchase orders' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
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
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get purchase order by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
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
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Create purchase order' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
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
    @Body() dto: CreatePurchaseOrdersDto,
  ) {
    const newPurchaseOrder = await this.purchaseOrderService.create(dto, req);

    return {
      statusCode: 201,
      message: 'Purchase order created successfully',
      result: toCamelCase(newPurchaseOrder),
    };
  }

  @ApiOperation({ summary: 'Update purchase order' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
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
    @Body() dto: UpdatePurchaseOrdersDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const updatedPurchaseOrder = await this.purchaseOrderService.update(
      id,
      dto,
      req,
    );

    return {
      statusCode: 200,
      message: 'Purchase order updated successfully',
      result: toCamelCase(updatedPurchaseOrder),
    };
  }

  @ApiOperation({ summary: 'Cancel purchase order' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
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
    @Body() dto: CancelPurchaseOrderDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.purchaseOrderService.cancel(id, dto, req);

    return {
      statusCode: 200,
      message: 'Purchase order cancelled successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Change purchase order status to confirmed' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPurchaseOrderDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.purchaseOrderService.confirm(id, dto, req);

    return {
      statusCode: 200,
      message: 'Purchase order confirmed successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Change purchase order status to shipped' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/ship')
  async ship(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const result = await this.purchaseOrderService.ship(id, req);

    return {
      statusCode: 200,
      message: 'Purchase order shipped successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Change purchase order status to received' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.purchaseOrderService.receive(id, dto, req);

    return {
      statusCode: 200,
      message: 'Purchase order received successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Change purchase order status to paid' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post(':id/pay')
  async pay(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const result = await this.purchaseOrderService.pay(id, req);

    return {
      statusCode: 200,
      message: 'Purchase order paid successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Generate PDF for purchase order' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_purchase_order')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id/pdf')
  async generatePdf(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer =
        await this.purchaseOrderService.generatePurchaseOrderPdf(id, req);

      // Get purchase order details for filename
      const purchaseOrder = await this.purchaseOrderService.findOne(id, req);
      const filename = `PO-${purchaseOrder.order_number}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.end(pdfBuffer);
    } catch (error) {
      console.log({ error });
      res.status(error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      });
    }
  }
}
