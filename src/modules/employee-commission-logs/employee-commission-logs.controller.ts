import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { EmployeeCommissionLogsService } from './employee-commission-logs.service';
import { CreateEmployeeCommissionLogDto } from './dto/create-employee-commission-log.dto';
import { UpdateEmployeeCommissionLogDto } from './dto/update-employee-commission-log.dto';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { EmployeeCommissionLogsListDto } from './dto/employee-commission-logs-list.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';

@Controller('employee-commission-logs')
export class EmployeeCommissionLogsController {
  constructor(
    private readonly employeeCommissionLogsService: EmployeeCommissionLogsService,
  ) {}

  @Post()
  create(
    @Body() createEmployeeCommissionLogDto: CreateEmployeeCommissionLogDto,
  ) {
    return this.employeeCommissionLogsService.create(
      createEmployeeCommissionLogDto,
    );
  }

  @ApiOperation({ summary: 'Get all employee commission logs' })
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
  async findAll(
    @Query() query: EmployeeCommissionLogsListDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const data = await this.employeeCommissionLogsService.findAll(query, req);
      return {
        statusCode: 200,
        message: 'Employee commission logs fetched successfully',
        result: toCamelCase(data),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeCommissionLogsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeCommissionLogDto: UpdateEmployeeCommissionLogDto,
  ) {
    return this.employeeCommissionLogsService.update(
      +id,
      updateEmployeeCommissionLogDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeCommissionLogsService.remove(+id);
  }
}
