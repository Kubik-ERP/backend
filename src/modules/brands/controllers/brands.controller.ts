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
import { BrandsService } from '../services/brands.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateBrandDto, UpdateBrandDto, GetBrandsDto } from '../dtos';
import {
  PreviewImportBrandsDto,
  ImportBrandsPreviewResponseDto,
} from '../dtos/import-preview.dto';
import {
  ExecuteImportBrandsDto,
  ExecuteImportBrandsResponseDto,
} from '../dtos/execute-import.dto';
import {
  DeleteBatchBrandsDto,
  DeleteBatchBrandsResponseDto,
} from '../dtos/delete-batch.dto';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('')
  @ApiOperation({
    summary: 'Create a new brand',
  })
  public async createBrand(
    @Body() createBrandDto: CreateBrandDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const brand = await this.brandsService.createBrand(createBrandDto, req);
    return {
      message: 'Brand successfully created',
      result: toCamelCase(brand),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand', 'manage_item')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get('')
  @ApiOperation({
    summary: 'Get list of brands',
  })
  public async getBrands(
    @Query() getBrandsDto: GetBrandsDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const brands = await this.brandsService.getBrands(getBrandsDto, req);
    return {
      message: 'Brands retrieved successfully',
      result: toCamelCase(brands),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get(':id')
  @ApiOperation({
    summary: 'Get brand by ID',
  })
  public async getBrandById(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    const brand = await this.brandsService.getBrandById(id, req);
    return {
      message: 'Brand retrieved successfully',
      result: toCamelCase(brand),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Put(':id')
  @ApiOperation({
    summary: 'Update brand by ID',
  })
  public async updateBrand(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const brand = await this.brandsService.updateBrand(id, updateBrandDto, req);
    return {
      message: 'Brand updated successfully',
      result: toCamelCase(brand),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete brand by ID',
  })
  public async deleteBrand(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
  ) {
    await this.brandsService.deleteBrand(id, req);
    return {
      message: 'Brand deleted successfully',
    };
  }

  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post('import/generate-template')
  @ApiOperation({ summary: 'Download brand import template' })
  async downloadImportTemplate(
    @Req() req: ICustomRequestHeaders,
    @Res() res: Response,
  ) {
    const buffer = await this.brandsService.generateImportTemplate(req);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="brands-import-template.xlsx"',
    });
    res.end(buffer);
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
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
    type: PreviewImportBrandsDto,
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

    const result = await this.brandsService.previewImport(file, req, batchId);
    return {
      message: 'Import preview processed successfully',
      result: toCamelCase(result),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_brand')
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
    summary: 'Execute import of brands from temp table',
  })
  async executeImport(
    @Body() dto: ExecuteImportBrandsDto,
    @Req() req: ICustomRequestHeaders,
  ): Promise<{ message: string; result: ExecuteImportBrandsResponseDto }> {
    const result = await this.brandsService.executeImport(dto.batchId, req);
    return {
      message: 'Import executed successfully',
      result: toCamelCase(result) as ExecuteImportBrandsResponseDto,
    };
  }

  @UseGuards(AuthPermissionGuard)
  // @RequirePermissions('manage_brand')
  @ApiBearerAuth()
  @Delete('import/batch')
  @ApiOperation({
    summary: 'Delete import batch from temp table',
    description:
      'Delete all records in temp_import_brands table for the specified batch_id',
  })
  @ApiBody({ type: DeleteBatchBrandsDto })
  async deleteBatch(
    @Body() dto: DeleteBatchBrandsDto,
  ): Promise<{ message: string; result: DeleteBatchBrandsResponseDto }> {
    const result = await this.brandsService.deleteBatch(dto.batchId);
    return {
      message: 'Import batch deleted successfully',
      result: {
        success: true,
        message: `Successfully deleted ${result.deletedCount} records`,
        deletedCount: result.deletedCount,
      },
    };
  }
}
