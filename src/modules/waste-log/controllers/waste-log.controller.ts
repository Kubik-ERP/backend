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
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';
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
  constructor(
    private readonly wasteLogService: WasteLogService,
    private readonly storageService: StorageService,
  ) {}

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
    // Process files similar to inventory items
    const processedPayload = await Promise.all(
      dto.payload.map(async (item, index) => {
        let relativePath = '';

        // Find corresponding image file for this payload item
        const imageFile = files.find(
          (file) => file.fieldname === `payload[${index}].image`,
        );

        if (imageFile) {
          // Upload image using storage service (same as inventory items)
          const uploadResult = await this.storageService.uploadImage(
            imageFile.buffer,
            imageFile.originalname,
          );
          relativePath = uploadResult.filename;
        }

        return {
          ...item,
          photo_url: relativePath || '',
        };
      }),
    );

    const wasteLog = await this.wasteLogService.create(
      { ...dto, payload: processedPayload },
      req,
    );
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
    // Process files similar to inventory items
    const processedPayload = await Promise.all(
      dto.payload.map(async (item, index) => {
        let relativePath = '';

        // Find corresponding image file for this payload item
        const imageFile = files.find(
          (file) => file.fieldname === `payload[${index}].image`,
        );

        if (imageFile) {
          // Upload image using storage service (same as inventory items)
          const uploadResult = await this.storageService.uploadImage(
            imageFile.buffer,
            imageFile.originalname,
          );
          relativePath = uploadResult.filename;
        }

        return {
          ...item,
          photo_url: relativePath || '',
        };
      }),
    );

    const wasteLog = await this.wasteLogService.update(
      id,
      { ...dto, payload: processedPayload },
      req,
    );
    return {
      message: 'Waste log updated successfully',
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
  @Delete(':id')
  @ApiOperation({ summary: 'Delete waste log by ID' })
  public async remove(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string }> {
    await this.wasteLogService.remove(id, req);
    return {
      message: 'Waste log deleted successfully',
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
  @Delete(':wasteLogId/items/:itemId')
  @ApiOperation({ summary: 'Delete waste log item by ID' })
  public async removeItem(
    @Param('wasteLogId') wasteLogId: string,
    @Param('itemId') itemId: string,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string }> {
    await this.wasteLogService.removeItem(wasteLogId, itemId, req);
    return {
      message: 'Waste log item deleted successfully',
    };
  }
}
