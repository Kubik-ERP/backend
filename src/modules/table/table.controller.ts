import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Controller('table')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Post()
  create(@Body() createTableDto: CreateTableDto) {
    return this.tableService.create(createTableDto);
  }

  @Get()
  findAll() {
    return this.tableService.findAll();
  }

  @Get('search/:idOrCode')
  findByIdOrCode(@Param('idOrCode') idOrCode: string) {
    return this.tableService.findOne(idOrCode);
  }

  @Get('many/:idOrCode')
  findMany(@Param('idOrCode') idOrCode: string) {
    return this.tableService.findMany(idOrCode);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    if (!updateTableDto.floor_id) {
      throw new NotFoundException('floor_id is required to update table');
    }

    return this.tableService.update(id, updateTableDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tableService.remove(id);
  }
}
