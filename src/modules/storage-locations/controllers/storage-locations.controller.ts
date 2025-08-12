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
  UseGuards,
} from '@nestjs/common';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { StorageLocationsService } from '../services/storage-locations.service';
import {
  CreateStorageLocationDto,
  UpdateStorageLocationDto,
  GetStorageLocationsDto,
} from '../dtos/index';

@ApiTags('Storage Locations (Warehouse)')
@Controller('storage-locations')
export class StorageLocationsController {
  constructor(
    private readonly storageLocationsService: StorageLocationsService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
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

  @UseGuards(AuthenticationJWTGuard)
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

  @UseGuards(AuthenticationJWTGuard)
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

  @UseGuards(AuthenticationJWTGuard)
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

  @UseGuards(AuthenticationJWTGuard)
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
}
