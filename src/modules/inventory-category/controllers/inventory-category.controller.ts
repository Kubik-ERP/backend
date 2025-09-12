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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { InventoryCategoryService } from '../services/inventory-category.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
  GetInventoryCategoriesDto,
  PreviewImportInventoryCategoriesDto,
  ExecuteImportInventoryCategoriesDto,
  DeleteBatchInventoryCategoriesDto,
} from '../dtos';

@ApiTags('Inventory Categories')
@Controller('inventory-categories')
export class InventoryCategoryController {
  constructor(
    private readonly inventoryCategoryService: InventoryCategoryService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({ summary: 'Create new inventory category' })
  async create(
    @Body() dto: CreateInventoryCategoryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const category = await this.inventoryCategoryService.create(dto, req);
    return {
      message: 'Inventory category created successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management', 'manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({ summary: 'Get list of inventory categories' })
  async list(
    @Query() query: GetInventoryCategoriesDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const categories = await this.inventoryCategoryService.list(query, req);
    return {
      message: 'Inventory categories retrieved successfully',
      result: toCamelCase(categories),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get inventory category detail' })
  async detail(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const category = await this.inventoryCategoryService.detail(id, req);
    return {
      message: 'Inventory category retrieved successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({ summary: 'Update inventory category' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryCategoryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const category = await this.inventoryCategoryService.update(id, dto, req);
    return {
      message: 'Inventory category updated successfully',
      result: toCamelCase(category),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory category' })
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    await this.inventoryCategoryService.remove(id, req);
    return {
      message: 'Inventory category deleted successfully',
    };
  }

  // Import Endpoints
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('import/generate-template')
  @ApiOperation({
    summary: 'Download import template for inventory categories',
  })
  async downloadImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer =
      await this.inventoryCategoryService.generateImportTemplate(req);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="inventory_categories_import_template.xlsx"',
    );

    return res.send(buffer);
  }

  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('import/preview')
  @ApiOperation({ summary: 'Preview import data for validation' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Body() dto: PreviewImportInventoryCategoriesDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryCategoryService.previewImport(
      dto,
      file,
      req,
    );
    return {
      message: 'Import preview generated successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('import/execute')
  @ApiOperation({ summary: 'Execute import from previewed data' })
  async executeImport(
    @Body() dto: ExecuteImportInventoryCategoriesDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.inventoryCategoryService.executeImport(dto, req);
    return {
      message: 'Import executed successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('category_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Delete('import/batch/:batchId')
  @ApiOperation({ summary: 'Delete batch data from temporary import table' })
  async deleteBatch(@Param('batchId') batchId: string) {
    const result = await this.inventoryCategoryService.deleteBatch({ batchId });
    return {
      message: 'Batch deleted successfully',
      result: toCamelCase(result),
    };
  }
}
