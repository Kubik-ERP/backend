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
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { Response } from 'express';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { StorageLocationsService } from '../services/storage-locations.service';
import {
  CreateStorageLocationDto,
  UpdateStorageLocationDto,
  GetStorageLocationsDto,
  PreviewImportStorageLocationsDto,
  ExecuteImportStorageLocationsDto,
  DeleteBatchStorageLocationsDto,
} from '../dtos/index';

@ApiTags('Storage Locations (Warehouse)')
@Controller('storage-locations')
export class StorageLocationsController {
  constructor(
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_storage_location')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({ summary: 'Create new storage location' })
  async create(
    @Body() dto: CreateStorageLocationDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const location = await this.storageLocationsService.create(dto, req);
    return {
      message: 'Storage location created successfully',
      result: toCamelCase(location),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_storage_location', 'manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({ summary: 'Get list of storage locations' })
  async list(
    @Query() query: GetStorageLocationsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const locations = await this.storageLocationsService.list(query, req);
    return {
      message: 'Storage locations retrieved successfully',
      result: toCamelCase(locations),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_storage_location')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get storage location detail' })
  async detail(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    const location = await this.storageLocationsService.detail(id, req);
    return {
      message: 'Storage location retrieved successfully',
      result: toCamelCase(location),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_storage_location')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({ summary: 'Update storage location' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStorageLocationDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const location = await this.storageLocationsService.update(id, dto, req);
    return {
      message: 'Storage location updated successfully',
      result: toCamelCase(location),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_storage_location')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    required: true,
    description: 'Store ID for request context',
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete storage location' })
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    await this.storageLocationsService.remove(id, req);
    return { message: 'Storage location deleted successfully' };
  }

  // Import endpoints
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/generate-template')
  @ApiOperation({ summary: 'Generate import template for storage locations' })
  async generateImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer =
      await this.storageLocationsService.generateImportTemplate(req);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="storage-locations-import-template.xlsx"',
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
    type: PreviewImportStorageLocationsDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ICustomRequestHeaders,
    @Body('batchId') batchId?: string,
  ) {
    const dto: PreviewImportStorageLocationsDto = { file, batchId };
    const result = await this.storageLocationsService.previewImport(
      dto,
      file,
      req,
    );
    return {
      message: 'Import preview generated successfully',
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
    summary: 'Execute import of storage locations from temp table',
  })
  async executeImport(
    @Body() dto: ExecuteImportStorageLocationsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.storageLocationsService.executeImport(dto, req);
    return {
      message: 'Import executed successfully',
      result: toCamelCase(result),
    };
  }

  @ApiBearerAuth()
  @Delete('import/batch')
  @ApiOperation({
    summary: 'Delete import batch from temp table',
    description:
      'Delete all records in temp_import_inventory_storage_locations table for the specified batch_id',
  })
  @ApiBody({ type: DeleteBatchStorageLocationsDto })
  async deleteBatch(@Body() dto: DeleteBatchStorageLocationsDto) {
    const result = await this.storageLocationsService.deleteBatch(dto);
    return {
      message: 'Import batch deleted successfully',
      result: toCamelCase(result),
    };
  }
}
