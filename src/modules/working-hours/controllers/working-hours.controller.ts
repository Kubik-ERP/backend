// src/working-hours/working-hours.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { WorkingHoursService } from '../services/working-hours.service';
import { CreateWorkingHoursDto } from '../dtos/working-hours.dto';

@ApiTags('Working Hours')
@ApiBearerAuth()
@UseGuards(AuthPermissionGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly service: WorkingHoursService) {}

  @Post()
  async create(@Body() dto: CreateWorkingHoursDto) {
    const data = await this.service.create(dto);
    return { message: 'Working hours created', result: data };
  }

  @Get()
  async findAll() {
    const data = await this.service.findAll();
    return { message: 'Working hours list', result: data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(+id);
    return { message: 'Working hours detail', result: data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateWorkingHoursDto) {
    const data = await this.service.update(+id, dto);
    return { message: 'Working hours updated', result: data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(+id);
    return { message: 'Working hours deleted', result: data };
  }
}
