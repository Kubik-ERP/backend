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
} from '@nestjs/common';
import { SuppliersService } from '../services/suppliers.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  GetSuppliersDto,
  GetItemSuppliesDto,
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('supplier_management')
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
