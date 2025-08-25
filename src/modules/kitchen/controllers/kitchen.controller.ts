import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { KitchenService } from '../services/kitchen.service';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';
import {
  KitchenBulkQueueUpdateOrderStatusDto,
  KitchenQueueUpdateOrderStatusDto,
} from '../dtos/queue.dto';
import { GetListInvoiceDto } from '../dtos/kitchen.dto';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
  @ApiBearerAuth()
  @Get('queue/customer')
  @ApiOperation({
    summary: 'Get Kitchen Queues List',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  public async getKitchenQueuesList(
    @Req() req: ICustomRequestHeaders,
    @Query() query: GetListInvoiceDto,
  ) {
    const response = await this.kitchenService.getKitchenQueuesList(req, query);
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
  @ApiBearerAuth()
  @Get('queue/kitchen')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Fetch kitchen queue list',
  })
  public async fetchKitchenQueueList(@Req() req: ICustomRequestHeaders) {
    const response = await this.kitchenService.queueList(req);
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
  @ApiBearerAuth()
  @Get('ticket/:invoiceId')
  @ApiOperation({
    summary: 'Get Kitchen Ticket in Invoice Detail',
  })
  public async getTicketByInvoiceId(@Param('invoiceId') invoiceId: string) {
    const response = await this.kitchenService.ticketByInvoiceId({
      invoiceId,
    });
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
  @ApiBearerAuth()
  @Put('queue')
  @ApiOperation({
    summary: 'Update bulk kitchen queue order status',
  })
  @ApiBody({
    type: [KitchenBulkQueueUpdateOrderStatusDto],
  })
  public async updateBulkKitchenQueueOrderStatus(
    @Body() request: KitchenBulkQueueUpdateOrderStatusDto[],
  ) {
    const response =
      await this.kitchenService.upadateBulkQueueOrderStatus(request);
    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('queue')
  @ApiBearerAuth()
  @Put('queue/:queueId')
  @ApiOperation({
    summary: 'Update kitchen queue order status',
  })
  public async updateKitchenQueueOrderStatus(
    @Param('queueId') queueId: string,
    @Body() request: KitchenQueueUpdateOrderStatusDto,
  ) {
    const response = await this.kitchenService.updateQueueOrderStatus(
      queueId,
      request,
    );
    return {
      result: toCamelCase(response),
    };
  }
}
