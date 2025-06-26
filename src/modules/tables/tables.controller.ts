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
  Query,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  async create(@Body() createTableDto: CreateTableDto) {
    try {
      const newTable = await this.tablesService.create(createTableDto);
      return {
        statusCode: 201,
        message: 'Table created successfully',
        result: toCamelCase(newTable),
      };
    } catch (error) {
      return {
        statusCode: error?.status || 500,
        message: error?.message || 'Failed to create table',
        result: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const tables = await this.tablesService.findAll();
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(tables),
      };
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch tables',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const table = await this.tablesService.findOne(id);

      if (!table) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Table not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(table),
      };
    } catch (error) {
      console.error('Error finding table:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch table',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    try {
      const updatedTable = await this.tablesService.update(id, updateTableDto);

      if (!updatedTable) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Table not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Table updated successfully',
        result: toCamelCase(updatedTable),
      };
    } catch (error) {
      console.error('Error updating table:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update table',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deleted = await this.tablesService.remove(id);

      if (!deleted) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Table not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Table deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting table:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete table',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('store/:storeId/:floorNumber')
  async findByStoreId(
    @Param('storeId') storeId: string,
    @Param('floorNumber') floorNumber: number,
  ) {
    try {
      const tables = await this.tablesService.findByStoreId(
        storeId,
        floorNumber,
      );
      return {
        statusCode: 200,
        message: 'Success',
        result: toCamelCase(tables),
      };
    } catch (error) {
      console.error('Error fetching tables by store:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch tables by store',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
