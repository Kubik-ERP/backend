import {
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
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuppliersService } from '../services/suppliers.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  GetSuppliersDto,
  GetItemSuppliesDto,
  PreviewImportSuppliersDto,
  ImportSuppliersPreviewResponseDto,
  ExecuteImportSuppliersDto,
  ExecuteImportSuppliersResponseDto,
  DeleteBatchSuppliersDto,
  DeleteBatchSuppliersResponseDto,
} from '../dtos';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({
    summary: 'Create a new supplier',
  })
  public async createSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const supplier = await this.suppliersService.createSupplier(
      createSupplierDto,
      req,
    );
    return {
      message: 'Supplier successfully created',
      result: toCamelCase(supplier),
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
  @Get('import/template')
  @ApiOperation({ summary: 'Download supplier import template' })
  async downloadImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer = await this.suppliersService.generateImportTemplate(req);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="suppliers-import-template.xlsx"',
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
    type: PreviewImportSuppliersDto,
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

    const result = await this.suppliersService.previewImport(
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
  @Post('import/execute')
  @ApiOperation({
    summary: 'Execute import of suppliers from temp table',
  })
  async executeImport(
    @Body() dto: ExecuteImportSuppliersDto,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string; result: ExecuteImportSuppliersResponseDto }> {
    const result = await this.suppliersService.executeImport(dto.batchId, req);
    return {
      message: 'Import executed successfully',
      result: toCamelCase(result) as ExecuteImportSuppliersResponseDto,
    };
  }

  @ApiBearerAuth()
  @Delete('import/batch')
  @ApiOperation({
    summary: 'Delete import batch from temp table',
    description:
      'Delete all records in temp_import_suppliers table for the specified batch_id',
  })
  @ApiBody({ type: DeleteBatchSuppliersDto })
  async deleteBatch(
    @Body() dto: DeleteBatchSuppliersDto,
  ): Promise<{ message: string; result: DeleteBatchSuppliersResponseDto }> {
    const result = await this.suppliersService.deleteBatch(dto.batchId);
    return {
      message: 'Import batch deleted successfully',
      result: {
        success: true,
        message: `Successfully deleted ${result.deletedCount} records`,
        deletedCount: result.deletedCount,
      },
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions(
    'supplier_management',
    'manage_purchase_order',
    'manage_item',
  )
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({
    summary: 'Get list of suppliers',
  })
  public async getSuppliers(
    @Query() getSuppliersDto: GetSuppliersDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const suppliers = await this.suppliersService.getSuppliers(
      getSuppliersDto,
      req,
    );
    return {
      message: 'Suppliers retrieved successfully',
      result: toCamelCase(suppliers),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management', 'view_supplier_details')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({
    summary: 'Get supplier by ID',
  })
  public async getSupplierById(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const supplier = await this.suppliersService.getSupplierById(id, req);
    return {
      message: 'Supplier retrieved successfully',
      result: toCamelCase(supplier),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({
    summary: 'Update supplier by ID',
  })
  public async updateSupplier(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const supplier = await this.suppliersService.updateSupplier(
      id,
      updateSupplierDto,
      req,
    );
    return {
      message: 'Supplier updated successfully',
      result: toCamelCase(supplier),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete supplier by ID',
  })
  public async deleteSupplier(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    await this.suppliersService.deleteSupplier(id, req);
    return {
      message: 'Supplier deleted successfully',
    };
  }

  /* -------------------------- Item Supplies listing -------------------------- */
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management', 'view_supplier_details')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id/item-supplies')
  @ApiOperation({
    summary: 'Get list of item supplies (inventory items under suppliers)',
  })
  @ApiParam({
    name: 'id',
    description: 'Supplier ID',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  public async getItemSupplies(
    @Param('id') id: string,
    @Query() query: GetItemSuppliesDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.suppliersService.getItemSupplies(id, query, req);
    return {
      message: 'Item supplies retrieved successfully',
      result: toCamelCase(result),
    };
  }
}
