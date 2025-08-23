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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthenticationJWTGuard } from '../../common/guards/authentication-jwt.guard';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { ImageUploadInterceptor } from '../../common/interceptors/image-upload.interceptor';
import { StorageService } from '../storage-service/services/storage-service.service';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { FindAllEmployeeQueryDto } from './dto/find-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create Employee' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const employee = await this.employeesService.create(
      createEmployeeDto,
      req,
      file,
    );
    return {
      message: 'Employee created successfully',
      result: toCamelCase(employee),
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: FindAllEmployeeQueryDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.employeesService.findAll(query, req);
    return {
      message: 'Employees fetched successfully',
      result: toCamelCase(data),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const employee = await this.employeesService.findOne(id);
    return {
      message: 'Employee fetched successfully',
      result: toCamelCase(employee),
    };
  }

  @Put(':id')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create Employee' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updatedEmployee = await this.employeesService.update(
      id,
      updateEmployeeDto,
      file,
    );
    return {
      message: 'Employee updated successfully',
      result: toCamelCase(updatedEmployee),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.employeesService.remove(id);
    return {
      message: 'Employee deleted successfully',
      result: null,
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Post('assign-to-store')
  async assignToStore(
    @Req() req: ICustomRequestHeaders,
    @Body() assignEmployeeDto: AssignEmployeeDto,
  ) {
    return await this.employeesService.assignToStore(assignEmployeeDto, req);
  }
}
