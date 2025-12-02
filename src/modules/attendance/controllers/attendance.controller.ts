// src/attendance/attendance.controller.ts
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { AttendanceService } from '../services/attendance.service';
import {
  AttendanceListDto,
  CreateAttendanceDto,
} from '../dtos/attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthPermissionGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post()
  async create(@Body() dto: CreateAttendanceDto) {
    const data = await this.service.create(dto);
    return { message: 'Attendance created', result: [data] };
  }

  @Get()
  async findAll(@Query() query: AttendanceListDto) {
    const data = await this.service.findAll(query);
    return { message: 'Attendance list', result: data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(+id);
    return { message: 'Attendance detail', result: [data] };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateAttendanceDto) {
    const data = await this.service.update(+id, dto);
    return { message: 'Attendance updated', result: [data] };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(+id);
    return { message: 'Attendance deleted', result: [data] };
  }
}
