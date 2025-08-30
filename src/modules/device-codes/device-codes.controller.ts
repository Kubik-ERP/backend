import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import { DeviceCodesService } from './device-codes.service';
import { CreateDeviceCodeDto } from './dto/create-device-code.dto';
import { UpdateDeviceCodeDto } from './dto/update-device-code.dto';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { DeviceCodesListDto } from './dto/device-codes-list.dto';

@Controller('device-codes')
export class DeviceCodesController {
  constructor(private readonly deviceCodesService: DeviceCodesService) {}

  @ApiOperation({ summary: 'Create Device Code' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateDeviceCodeDto,
  ) {
    const newDeviceCode = await this.deviceCodesService.create(dto, req);

    return {
      statusCode: 201,
      message: 'Device code created successfully',
      result: toCamelCase(newDeviceCode),
    };
  }

  @ApiOperation({ summary: 'Get all device codes' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: DeviceCodesListDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const deviceCodes = await this.deviceCodesService.findAll(query, req);
      return {
        statusCode: 200,
        message: 'Device codes fetched successfully',
        result: toCamelCase(deviceCodes),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get device code by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Req() req: ICustomRequestHeaders, @Param('id') id: string) {
    try {
      const deviceCode = await this.deviceCodesService.findOne(id, req);
      return {
        statusCode: 200,
        message: 'Device code fetched successfully',
        result: toCamelCase(deviceCode),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Update Device Code' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() dto: UpdateDeviceCodeDto,
  ) {
    const result = await this.deviceCodesService.update(id, dto, req);

    return {
      statusCode: 200,
      message: 'Device code updated successfully',
      result: toCamelCase(result),
    };
  }

  @ApiOperation({ summary: 'Delete Device Code' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      await this.deviceCodesService.remove(id, req);
      return {
        statusCode: 200,
        message: 'Device code deleted successfully',
        result: null,
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Disconnect Device Code' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('connected_device_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post(':id/disconnect')
  async disconnect(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      await this.deviceCodesService.disconnect(id, req);
      return {
        statusCode: 200,
        message: 'Device code disconnected successfully',
        result: null,
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }
}
