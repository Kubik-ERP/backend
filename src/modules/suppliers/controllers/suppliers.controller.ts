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
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateSupplierDto, UpdateSupplierDto, GetSuppliersDto } from '../dtos';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @UseGuards(AuthenticationJWTGuard)
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
      result: {
        ...suppliers,
        data: toCamelCase(suppliers.data),
      },
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

  @UseGuards(AuthenticationJWTGuard)
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

  @UseGuards(AuthenticationJWTGuard)
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
}
