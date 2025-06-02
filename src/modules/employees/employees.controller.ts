import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    try {
      const newEmployee = await this.employeesService.create(createEmployeeDto);
      return {
        statusCode: 201,
        message: 'Employee created successfully',
        result: toCamelCase(newEmployee),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const employees = await this.employeesService.findAll();
      return {
        statusCode: 200,
        message: 'Employees fetched successfully',
        result: toCamelCase(employees),
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
  async findOne(@Param('id') id: string) {
    try {
      const employee = await this.employeesService.findOne(id);
      return {
        statusCode: 200,
        message: 'Employee fetched successfully',
        result: toCamelCase(employee),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    try {
      const updatedEmployee = await this.employeesService.update(
        id,
        updateEmployeeDto,
      );
      return {
        statusCode: 200,
        message: 'Employee updated successfully',
        result: toCamelCase(updatedEmployee),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.employeesService.remove(id);
      return {
        statusCode: 200,
        message: 'Employee deleted successfully',
        result: null,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }
}
