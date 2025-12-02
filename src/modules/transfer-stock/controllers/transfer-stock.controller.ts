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
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
import { ChangeStatusReceiveDto } from '../dtos/change-status-received.dto';
import { TransferStockLossDto } from '../dtos/transfer-stock-loss.dto';
import { TransferStockLossResponseDto } from '../dtos/transfer-stock-loss-response.dto';
import { GetTransferStockLossResponseDto } from '../dtos/get-transfer-stock-loss-response.dto';
import { CheckProductDestinationResponseDto } from '../dtos/check-product-destination-response.dto';

@ApiTags('Transfer Stock')
@Controller()
export class TransferStockController {
  constructor(private readonly transferStockService: TransferStockService) {}

  @ApiOperation({ summary: 'Get all transfer stock' })
  @ApiOkResponse({
    description: 'Transfer stock list response',
    type: TransferStockListResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer-stock')
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
    type: CreateTransferStockResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer-stock')
  async createTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateTransferStockDto,
  ) {
    const newTransferStock = await this.transferStockService.create(req, dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Transfer stock created successfully',
      result: toCamelCase(newTransferStock),
    };
  }

  @ApiOperation({ summary: 'Get transfer stock' })
  @ApiOkResponse({
    description: 'Get transfer stock response',
    type: GetTransferStockResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer-stock/:id')
  async getTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID,
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
    type: UpdateTransferStockResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Put('transfer-stock/:id')
  async updateTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: UpdateTransferStockDto,
    @Param('id') id: UUID,
  ) {
    const transferStock = await this.transferStockService.update(id, req, dto);

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
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer-stock/change-status/:id')
  async changeStatus(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID,
    @Body() body: ChangeStatusDto,
  ) {
    const result = await this.transferStockService.changeStatus(req, id, body);
    return result;
  }

  @ApiOperation({ summary: 'Check has product in destination store' })
  @ApiOkResponse({
    description: 'Check and create missing destination store products.',
    type: CheckProductDestinationResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer-stock/check-product-destination/:id')
  async checkProduct(@Req() req: ICustomRequestHeaders, @Param('id') id: UUID) {
    const result = await this.transferStockService.checkProduct(req, id);
    return result;
  }

  @ApiOperation({ summary: 'Receive transfer sotck' })
  @ApiBody({
    description: 'Body berbeda sesuai status',
    examples: {
      Received: {
        summary: 'Status received',
        description: 'Gunakan ketika menerima transfer stock',
        value: {
          status: 'received',
          items: [
            {
              itemId: 'a0df2ccd-f6df-402e-8818-c85f08d750c0',
              qty_shipped: 25,
              qty_received: 25,
              notes: '',
            },
            {
              itemId: 'f4fb8b18-b3bb-4349-8bd5-ab52cb067d31',
              qty_shipped: 15,
              qty_received: 15,
              notes: '',
            },
          ],
        },
      },
      ReceivedWithIssue: {
        summary: 'Status received_with_issue',
        description: 'Gunakan ketika menerima transfer stock dengan masalah',
        value: {
          status: 'received_with_issue',
          items: [
            {
              itemId: 'a0df2ccd-f6df-402e-8818-c85f08d750c0',
              qty_shipped: 25,
              qty_received: 20,
              notes: 'Beberapa barang rusak',
            },
            {
              itemId: 'f4fb8b18-b3bb-4349-8bd5-ab52cb067d31',
              qty_shipped: 15,
              qty_received: 10,
              notes: 'Kardus penyok',
            },
          ],
        },
      },
    },
    type: ChangeStatusReceiveDto,
  })
  @ApiOkResponse({
    description: 'Response ketika transfer stock berhasil diterima',
    type: ChangeStatusResponseDto,
    examples: {
      Received: {
        summary: 'Response untuk status received',
        value: {
          statusCode: 200,
          message: 'Transfer stock received successfully.',
        },
      },
      ReceivedWithIssue: {
        summary: 'Response untuk status received_with_issue',
        value: {
          statusCode: 200,
          message: 'Transfer stock received with issue successfully.',
        },
      },
    },
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('transfer-stock/receive/:id')
  async receiveStock(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID,
    @Body() body: ChangeStatusReceiveDto,
  ) {
    const result = await this.transferStockService.receiveStock(req, id, body);
    return result;
  }

  @ApiOperation({ summary: 'Delete transfer sotck' })
  @ApiOkResponse({
    description: 'Delete transfer stock response',
    type: DeleteTransferStockResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Delete('transfer-stock/:id')
  async deleteTransferStock(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID,
  ) {
    const result = await this.transferStockService.delete(req, id);
    return result;
  }

  @ApiOperation({ summary: 'Get all transfer stock loss' })
  @ApiOkResponse({
    description: 'Transfer stock loss response',
    type: TransferStockLossResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer-stock-losses')
  async findAllTransferStockLoss(
    @Req() req: ICustomRequestHeaders,
    @Query() dto: TransferStockLossDto,
  ) {
    try {
      const transferStockLoss =
        await this.transferStockService.findAllTransferStockLoss(dto, req);
      return {
        statusCode: HttpStatus.OK,
        message: 'Transfer Stock Loss fetched successfully',
        result: toCamelCase(transferStockLoss),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get transfer stock loss' })
  @ApiOkResponse({
    description: 'Get transfer stock loss response',
    type: GetTransferStockLossResponseDto,
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_transfer_stock')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('transfer-stock-losses/:id')
  async getTransferStockLoss(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: UUID,
  ) {
    const transferStockLoss = await this.transferStockService.getLoss(id);

    return {
      statusCode: 200,
      message: 'Get transfer stock loss successfully',
      result: toCamelCase(transferStockLoss),
    };
  }
}
