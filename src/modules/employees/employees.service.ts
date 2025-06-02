import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateEmployeeDto,
  CreateEmployeeHasRoleDto,
} from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { gender, Prisma } from '@prisma/client';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employees.findFirst({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      return existing;
    }

    const employee = await this.prisma.employees.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone_number: dto.phone_number,
        profile_url: dto.profile_url,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        gender: dto.gender as gender,
      },
    });

    if (dto.roles && dto.roles.length > 0) {
      for (const roleId of dto.roles) {
        const relationDto: CreateEmployeeHasRoleDto = {
          staffs_id: employee.id,
          roles_id: roleId,
        };
        await this.prisma.employees_has_roles.create({
          data: relationDto,
        });
      }
    }
  }

  async findAll() {
    return this.prisma.employees.findMany();
  }

  async findOne(id: string) {
    const employee = await this.prisma.employees.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);

    return this.prisma.employees.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.employees.delete({
      where: { id },
    });
  }
}
