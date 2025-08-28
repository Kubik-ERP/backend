import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RolesListDto } from './dto/roles-list.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'Create role' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post()
  async create(@Req() req: ICustomRequestHeaders, @Body() dto: CreateRoleDto) {
    const newRole = await this.rolesService.create(dto, req);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Role created successfully',
      result: toCamelCase(newRole),
    };
  }

  @ApiOperation({ summary: 'Get all roles' })
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
  async findAll(@Req() req: ICustomRequestHeaders, @Query() dto: RolesListDto) {
    try {
      const roles = await this.rolesService.findAll(dto, req);
      return {
        statusCode: HttpStatus.OK,
        message: 'Roles fetched successfully',
        result: toCamelCase(roles),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get role by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      const role = await this.rolesService.findOne(id, req);
      return {
        statusCode: 200,
        message: 'Role fetched successfully',
        result: toCamelCase(role),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Update role by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const updatedRole = await this.rolesService.update(id, dto, req);
      return {
        statusCode: 200,
        message: 'Role updated successfully',
        result: toCamelCase(updatedRole),
      };
    } catch (error) {
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Delete role by id' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('manage_staff_member')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      await this.rolesService.remove(id, req);
      return {
        statusCode: 200,
        message: 'Role deleted successfully',
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
