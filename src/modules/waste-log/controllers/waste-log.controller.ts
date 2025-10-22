import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateWasteLogDto,
  GetWasteLogsDto,
  UpdateWasteLogDto,
  WasteLogListResponseDto,
  WasteLogResponseDto,
} from '../dtos';
import { WasteLogFormDataInterceptor } from '../interceptors/waste-log-form-data.interceptor';
import { WasteLogService } from '../services/waste-log.service';

@ApiTags('Waste Log')
@Controller('waste-log')
export class WasteLogController {
  constructor(private readonly wasteLogService: WasteLogService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(), WasteLogFormDataInterceptor)
  @ApiOperation({ summary: 'Create a new waste log' })
  @ApiBody({
    description: 'Create waste log with dynamic payload array and images',
    schema: {
      type: 'object',
      properties: {
        batchId: {
          type: 'string',
          format: 'uuid',
          description: 'Batch ID for grouping waste logs',
        },
        'payload[0].inventory_item_id': {
          type: 'string',
          format: 'uuid',
          description: 'Inventory item ID for first item',
        },
        'payload[0].category': {
          type: 'string',
          description: 'Category for first item',
        },
        'payload[0].quantity': {
          type: 'number',
          description: 'Quantity for first item',
        },
        'payload[0].uom': {
          type: 'string',
          description: 'Unit of measurement for first item',
        },
        'payload[0].notes': {
          type: 'string',
          description: 'Notes for first item',
        },
        'payload[0].image': {
          type: 'string',
          format: 'binary',
          description: 'Image file for first item',
        },
        // Dynamic pattern continues for payload[1], payload[2], etc.
      },
    },
  })
  public async create(
    @Body() dto: CreateWasteLogDto,
    @Req() req: ICustomRequestHeaders,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; result: WasteLogResponseDto }> {
    const wasteLog = await this.wasteLogService.create(dto, files, req);
    return {
      message: 'Waste log created successfully',
      result: toCamelCase(wasteLog) as WasteLogResponseDto,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  @ApiOperation({ summary: 'Get list of waste logs' })
  public async list(
    @Query() query: GetWasteLogsDto,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string; result: WasteLogListResponseDto }> {
    const result = await this.wasteLogService.list(query, req);
    return {
      message: 'Waste logs retrieved successfully',
      result: toCamelCase(result) as WasteLogListResponseDto,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get waste log by ID' })
  public async detail(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string; result: WasteLogResponseDto }> {
    const wasteLog = await this.wasteLogService.detail(id, req);
    return {
      message: 'Waste log retrieved successfully',
      result: toCamelCase(wasteLog) as WasteLogResponseDto,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(AnyFilesInterceptor(), WasteLogFormDataInterceptor)
  @ApiOperation({ summary: 'Update waste log by ID' })
  @ApiBody({
    description: 'Update waste log with dynamic payload array and images',
    schema: {
      type: 'object',
      properties: {
        batchId: {
          type: 'string',
          format: 'uuid',
          description: 'Batch ID for grouping waste logs',
        },
        'payload[0].inventory_item_id': {
          type: 'string',
          format: 'uuid',
          description: 'Inventory item ID for first item',
        },
        'payload[0].category': {
          type: 'string',
          description: 'Category for first item',
        },
        'payload[0].quantity': {
          type: 'number',
          description: 'Quantity for first item',
        },
        'payload[0].uom': {
          type: 'string',
          description: 'Unit of measurement for first item',
        },
        'payload[0].notes': {
          type: 'string',
          description: 'Notes for first item',
        },
        'payload[0].image': {
          type: 'string',
          format: 'binary',
          description: 'Image file for first item',
        },
        // Dynamic pattern continues for payload[1], payload[2], etc.
      },
    },
  })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateWasteLogDto,
    @Req() req: ICustomRequestHeaders,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string; result: WasteLogResponseDto }> {
    const wasteLog = await this.wasteLogService.update(id, dto, files, req);
    return {
      message: 'Waste log updated successfully',
      result: toCamelCase(wasteLog) as WasteLogResponseDto,
    };
  }
}
