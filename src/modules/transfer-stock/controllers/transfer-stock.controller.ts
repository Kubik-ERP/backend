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
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { TransferStockService } from '../services/transfer-stock.service';
import { TransferStockListDto } from '../dtos/transfer-stock-list.dto';
import { CreateTransferStockDto } from '../dtos/create-transfer-stock.dto';
import { UpdateTransferStockDto } from '../dtos/update-transfer-stock.dto';
import { UUID } from 'crypto';
import { ChangeStatusDto } from '../dtos/change-status.dto';
import { TransferStockListResponseDto } from '../dtos/transfer-stock-list-response.dto';
import { CreateTransferStockResponseDto } from '../dtos/create-transfer-stock-response.dto';
import { GetTransferStockResponseDto } from '../dtos/get-transfer-stock-response.dto';
import { UpdateTransferStockResponseDto } from '../dtos/update-transfer-stock-response.dto';
import { DeleteTransferStockResponseDto } from '../dtos/delete-transfer-stock-response.dto';
import { ChangeStatusResponseDto } from '../dtos/change-status-response.dto';

@Controller('transfer-stock')
export class TransferStockController {
  constructor(private readonly transferStockService: TransferStockService) {}

  @ApiOperation({ summary: 'Get all transfer stock' })
  @ApiOkResponse({
    description: 'Transfer stock list response',
    type: TransferStockListResponseDto
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
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

  @ApiOperation({ summary: 'Create transfer stock' })
  @ApiOkResponse({
    description: 'Create transfer stock response',
    type: CreateTransferStockResponseDto
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post()
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

  @ApiOperation({ summary: 'Get transfer stock' })
  @ApiOkResponse({
    description: 'Get transfer stock response',
    type: GetTransferStockResponseDto
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id')
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

  @ApiOperation({ summary: 'Update transfer stock' })
  @ApiOkResponse({
    description: 'Update transfer stock response',
    type: UpdateTransferStockResponseDto
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Put(':id')
  async updateTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: UpdateTransferStockDto,
    @Param('id') id: UUID
  ) {
    const transferStock = await this.transferStockService.update(
      id,
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
  @ApiBody({
    description: 'Body berbeda sesuai status',
    examples: {
      Approve: {
        summary: 'Status approve',
        description: 'Gunakan ketika menyetujui transfer stock.',
        value: {
          status: 'approve',
        },
      },
      Cancel: {
        summary: 'Status cancel',
        description: 'Gunakan ketika membatalkan transfer stock.',
        value: {
          status: 'cancel',
          note: 'Stock tidak cukup',
        },
      },
      Ship: {
        summary: 'Status ship',
        description: 'Gunakan ketika mengirim transfer stock.',
        value: {
          status: 'ship',
          logistic_provider: 'JNE',
          tracking_number: 'JNE-001',
          delivery_note: 'Jangan dibanting',
        },
      },
    },
    type: ChangeStatusDto,
  })
  @ApiOkResponse({
    description: 'Response ketika status transfer stock berhasil diubah',
    type: ChangeStatusResponseDto,
    examples: {
      Approve: {
        summary: 'Response untuk status approve',
        value: {
          statusCode: 200,
          message: 'Transfer stock approved successfully.',
        },
      },
      Cancel: {
        summary: 'Response untuk status cancel',
        value: {
          statusCode: 200,
          message: 'Transfer stock canceled successfully.',
        },
      },
      Ship: {
        summary: 'Response untuk status ship',
        value: {
          statusCode: 200,
          message: 'Transfer stock shipped successfully.',
        },
      },
    },
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('change-status/:id')
  async changeStatus(@Req() req: ICustomRequestHeaders, @Param('id') id: UUID, @Body() body: ChangeStatusDto) {
    const result = await this.transferStockService.changeStatus(req, id, body);
    return result;
  }

  @ApiOperation({ summary: 'Delete transfer sotck' })
  @ApiOkResponse({
    description: 'Delete transfer stock response',
    type: DeleteTransferStockResponseDto
  })
  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Delete(':id')
  async deleteTransferStock(@Req() req: ICustomRequestHeaders, @Param('id') id: UUID) {
    const result = await this.transferStockService.delete(req, id);
    return result;
  }
}