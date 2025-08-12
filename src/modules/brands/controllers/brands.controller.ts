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
import { BrandsService } from '../services/brands.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateBrandDto, UpdateBrandDto, GetBrandsDto } from '../dtos';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

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
}
