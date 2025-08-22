import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'Create role' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    try {
      const newRole = await this.rolesService.create(createRoleDto);
      return {
        statusCode: 201,
        message: 'Role created successfully',
        result: toCamelCase(newRole),
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: error.message || 'Failed to create role',
          result: null,
        },
        HttpStatus.CONFLICT,
      );
    }
  }

  @ApiOperation({ summary: 'Get all roles' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get()
  async findAll() {
    try {
      const roles = await this.rolesService.findAll();
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(roles),
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch roles',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get role by id' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const role = await this.rolesService.findOne(id);
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(role),
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      console.error('Error finding role:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch role',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update role by id' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    try {
      const updatedRole = await this.rolesService.update(id, updateRoleDto);
      return {
        statusCode: 200,
        message: 'Role updated successfully',
        result: toCamelCase(updatedRole),
      };
    } catch (error) {
      if (
        error.status === HttpStatus.NOT_FOUND ||
        error.status === HttpStatus.CONFLICT
      ) {
        throw new HttpException(
          {
            statusCode: error.status,
            message: error.message,
          },
          error.status,
        );
      }

      console.error('Error updating role:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to update role',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Delete role by id' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.rolesService.remove(id);
      return {
        statusCode: 200,
        message: 'Role deleted successfully',
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      console.error('Error deleting role:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete role',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
