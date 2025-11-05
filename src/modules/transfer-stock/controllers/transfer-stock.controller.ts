import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Req,
  Query,
  Put,
} from '@nestjs/common';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { TransferStockService } from '../services/transfer-stock.service';
import { TransferStockListDto } from '../dtos/transfer-stock-list.dto';
import { CreateTransferStockDto } from '../dtos/create-transfer-stock.dto';
import { ItemListDto } from '../dtos/item-list.dto';
import { UpdateTransferStockDto } from '../dtos/update-transfer-stock.dto';
import { UUID } from 'crypto';
import { ChangeStatusDto } from '../dtos/change-status-dto';

@Controller('transfer-stock')
export class TransferStockController {
  constructor(private readonly transferStockService: TransferStockService) {}

  @ApiOperation({ summary: 'Get all transfer stock' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer')
  async findAllTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Query() dto: TransferStockListDto,
  ) {
    try {
      const transferStocks =
        await this.transferStockService.findAllTransferStock(dto, req);
      return {
        statusCode: HttpStatus.OK,
        message: 'Transfer Stock fetched successfully',
        result: toCamelCase(transferStocks),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get all items by store_to_id' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer/item-list')
  async findAllItemList(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: ItemListDto,
    @Query('search') search?: string,
  ) {
    try {
      const items = await this.transferStockService.findAllItem(
        req,
        dto,
        search,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Item list fetched successfully',
        result: toCamelCase(items),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Create transfer sotck' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer')
  async createTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateTransferStockDto,
  ) {
    const newTransferStock = await this.transferStockService.create(
      req,
      dto
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Transfer stock created successfully',
      result: toCamelCase(newTransferStock),
    };
  }

  @ApiOperation({ summary: 'Update transfer sotck' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('detail/:id')
  async getTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID
  ) {
    const transferStock = await this.transferStockService.get(id);

    return {
      statusCode: 200,
      message: 'Get transfer stock successfully',
      result: toCamelCase(transferStock),
    };
  }

  @ApiOperation({ summary: 'Update transfer sotck' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Put('transfer')
  async updateTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: UpdateTransferStockDto,
  ) {
    const transferStock = await this.transferStockService.update(
      req,
      dto
    );

    return {
      statusCode: 200,
      message: 'Transfer stock updated successfully',
      result: toCamelCase(transferStock),
    };
  }

  @ApiOperation({ summary: 'Update status transfer sotck' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer/change-status/:id')
  async changeStatus(@Req() req: ICustomRequestHeaders, @Param('id') id: UUID, @Body() body: ChangeStatusDto) {
    const result = await this.transferStockService.changeStatus(req, id, body);
    return result;
  }

  @ApiOperation({ summary: 'Delete transfer sotck' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Delete('transfer/delete/:id')
  async deleteTransferStock(@Req() req: ICustomRequestHeaders, @Param('id') id: UUID) {
    const result = await this.transferStockService.delete(req, id);
    return result;
  }

  @ApiOperation({ summary: 'Get all transfer stock' })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('receiver')
  async findAllReceiverStock(
    @Req() req: ICustomRequestHeaders,
    @Query() dto: TransferStockListDto,
  ) {
    try {
      const receiverStocks =
        await this.transferStockService.findAllReceiverStock(dto, req);
      return {
        statusCode: HttpStatus.OK,
        message: 'Receiver Stock fetched successfully',
        result: toCamelCase(receiverStocks),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }
}