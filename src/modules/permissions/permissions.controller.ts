import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Req,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AssignPermissionsToRolesDto } from './dto/assign-permissions-to-roles.dto';
import { GetPermissionsByIdsDto } from './dto/get-permissions-by-ids.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @ApiOperation({ summary: 'Get all permissions' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(@Req() req: ICustomRequestHeaders) {
    try {
      const permissions = await this.permissionsService.findAll(req);
      return {
        statusCode: 200,
        message: 'Permissions fetched successfully',
        result: toCamelCase(permissions),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Assign permissions to roles' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Patch('assign-to-roles')
  async assignToRoles(
    @Body() dto: AssignPermissionsToRolesDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const permissions = await this.permissionsService.assignToRoles(dto, req);
      return {
        statusCode: 200,
        message: 'Permissions assigned to roles successfully',
        result: toCamelCase(permissions),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get permissions of the current user' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('me')
  async me(@Req() req: ICustomRequestHeaders) {
    const permissions = await this.permissionsService.me(req);

    return {
      statusCode: 200,
      message: 'Permissions fetched successfully',
      result: permissions,
    };
  }

  @ApiOperation({ summary: 'Get permissions by ids array' })
  @ApiHeader({
    name: 'x-server-key',
    description: 'Custom API Key',
  })
  @ApiBearerAuth()
  @Get('by-ids')
  async getByIds(@Query() query: GetPermissionsByIdsDto) {
    try {
      const permissions = await this.permissionsService.findByIds(query.ids);
      return {
        statusCode: 200,
        message: 'Permissions fetched successfully',
        result: toCamelCase(permissions),
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
