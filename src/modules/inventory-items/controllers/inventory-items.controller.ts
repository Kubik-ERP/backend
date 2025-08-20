import { Response } from 'express';
import {
  BadRequestException,
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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsUUID } from 'class-validator';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateInventoryItemDto,
  GetInventoryItemsDto,
  UpdateInventoryItemDto,
  PreviewImportDto,
  ImportPreviewResponseDto,
} from '../dtos';
import {
  CreateStockAdjustmentDto,
  GetStockAdjustmentsDto,
  UpdateStockAdjustmentDto,
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
  @Post('import/generate-template')
  @ApiOperation({ summary: 'Generate import template for inventory items' })
  async generateImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer = await this.inventoryItemsService.generateImportTemplate(req);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="inventory-items-import-template.xlsx"',
    });
    res.end(buffer);
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/preview-data')
  @ApiOperation({ summary: 'Preview import data from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file to import',
    type: PreviewImportDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ICustomRequestHeaders,
    @Body('batchId') batchId?: string,
  ) {
    // Validate batch_id if provided
    if (
      batchId &&
      !batchId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
      throw new BadRequestException(
        'Invalid batch ID format. Must be a valid UUID v4',
      );
    }

    const result = await this.inventoryItemsService.previewImport(
      file,
      req,
      batchId,
    );
    return {
      message: 'Import preview processed successfully',
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

  // Detail for Stock Adjustment page header (with joined info)
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id/stock-adjustments/detail')
  @ApiOperation({
    summary: 'Get inventory item detail for Stock Adjustment page',
  })
  public async stockAdjustmentDetail(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const item = await this.inventoryItemsService.stockAdjustmentDetail(
      id,
      req,
    );
    return {
      message:
        'Inventory item (stock adjustment detail) retrieved successfully',
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

  // Tracking log list
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id/stock-adjustments')
  @ApiOperation({ summary: 'Get stock adjustment tracking log for an item' })
  public async listStockAdjustments(
    @Param('id') id: string,
    @Query() query: GetStockAdjustmentsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryItemsService.listStockAdjustments(
      id,
      query,
      req,
    );
    return {
      message: 'Stock adjustments retrieved successfully',
      result: toCamelCase(result),
    };
  }

  // Add stock adjustment
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post(':id/stock-adjustments')
  @ApiOperation({ summary: 'Add stock adjustment (Stock In / Stock Out)' })
  public async addStockAdjustment(
    @Param('id') id: string,
    @Body() dto: CreateStockAdjustmentDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryItemsService.addStockAdjustment(
      id,
      dto,
      req,
    );
    return {
      message: 'Stock adjustment created successfully',
      result: toCamelCase(result),
    };
  }

  // Update stock adjustment
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Put(':id/stock-adjustments/:adjustmentId')
  @ApiOperation({ summary: 'Update a stock adjustment record' })
  public async updateStockAdjustment(
    @Param('id') id: string,
    @Param('adjustmentId') adjustmentId: string,
    @Body() dto: UpdateStockAdjustmentDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryItemsService.updateStockAdjustment(
      id,
      adjustmentId,
      dto,
      req,
    );
    return {
      message: 'Stock adjustment updated successfully',
      result: toCamelCase(result),
    };
  }
}
