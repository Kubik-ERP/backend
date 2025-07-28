import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { gender, Prisma } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const {
      name,
      email,
      profilePicture,
      phoneCode,
      phoneNumber,
      startDate,
      endDate,
      gender,
      title,
      permission,
      socialMedia,
      shift,
      comissions,
    } = dto;

    const existingEmployee = await this.prisma.employees.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      throw new Error(`Email "${email}" is already in use.`);
    }
    const employee = await this.prisma.employees.create({
      data: {
        name,
        email,
        profile_url: profilePicture,
        phone_code: phoneCode,
        phone_number: phoneNumber,
        start_date: startDate,
        end_date: endDate,
        gender,
        title,
        permission,
      },
    });

    const employeeId = employee.id;

    // Social media
    if (socialMedia && socialMedia.length > 0) {
      for (const sm of socialMedia) {
        if (!sm.name || !sm.account) continue;

        try {
          await this.prisma.employees_has_social_media.create({
            data: {
              employees_id: employeeId,
              media_name: sm.name,
              account_name: sm.account,
            },
          });
        } catch (err) {
          console.error(`Failed to insert social media for ${sm.name}:`, err);
        }
      }
    }

    // Shift
    if (Array.isArray(shift)) {
      const shiftData = shift.map((s) => ({
        employees_id: employeeId,
        days: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      await this.prisma.employees_shift.createMany({
        data: shiftData,
      });
    }

    // Commissions
    const insertedProductCommissions = [];
    const insertedVoucherCommissions = [];

    if (comissions) {
      // Product Commissions
      if (
        Array.isArray(comissions.productComission) &&
        comissions.productComission.length > 0
      ) {
        for (const pc of comissions.productComission) {
          if (!pc.product_id || pc.amount === undefined) continue;

          try {
            const result = await this.prisma.product_commissions.create({
              data: {
                employees_id: employeeId,
                is_percent: pc.is_percent ?? false,
                products_id: pc.product_id,
                amount: pc.amount ?? 0,
              },
            });
            insertedProductCommissions.push(result);
          } catch (error) {
            console.error(`Failed to insert product commission:`, error);
          }
        }
      }

      if (
        Array.isArray(comissions.voucherCommission) &&
        comissions.voucherCommission.length > 0
      ) {
        for (const vc of comissions.voucherCommission) {
          if (!vc.voucher_id || vc.amount === undefined) continue;

          try {
            const result = await this.prisma.voucher_commissions.create({
              data: {
                employees_id: employeeId,
                is_percent: vc.is_percent ?? false,
                voucher_id: vc.voucher_id,
                amount: vc.amount ?? 0,
              },
            });
            insertedVoucherCommissions.push(result);
          } catch (error) {
            console.error(`Failed to insert voucher commission:`, error);
          }
        }
      }
    }

    return {
      message: 'Employee created successfully',
      data: {
        employee,
        shift,
        productCommissions: insertedProductCommissions,
        voucherCommissions: insertedVoucherCommissions,
      },
    };
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    name?: string;
    title?: string;
    permissions?: string;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.employeesWhereInput = {};

    if (query?.title) {
      where.title = {
        contains: query.title,
        mode: 'insensitive',
      };
    }

    if (query?.permissions) {
      where.permission = {
        contains: query.permissions,
        mode: 'insensitive',
      };
    }

    if (query?.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    const data = await this.prisma.employees.findMany({
      where,
      skip,
      take: limit,
      include: {
        employees_has_roles: { include: { roles: true } },
        employees_has_social_media: true,
        employees_shift: true,
        product_commissions: true,
        voucher_commissions: true,
      },
    });

    const total = await this.prisma.employees.count({
      where,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employees.findUnique({
      where: { id },
      include: {
        employees_has_roles: { include: { roles: true } },
        employees_has_social_media: true,
        employees_shift: true,
        product_commissions: true,
        voucher_commissions: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const {
      name,
      email,
      profilePicture,
      phoneCode,
      phoneNumber,
      startDate,
      endDate,
      gender,
      title,
      permission,
      socialMedia,
      shift,
      comissions,
    } = dto;

    const existing = await this.prisma.employees.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const updatedEmployee = await this.prisma.employees.update({
      where: { id },
      data: {
        name,
        email,
        profile_url: profilePicture,
        phone_code: phoneCode,
        phone_number: phoneNumber,
        start_date: startDate ? new Date(startDate) : undefined,
        end_date: endDate ? new Date(endDate) : undefined,
        gender,
        title,
        permission,
      },
    });

    await this.prisma.employees_has_social_media.deleteMany({
      where: { employees_id: id },
    });
    if (Array.isArray(socialMedia)) {
      for (const sm of socialMedia) {
        if (!sm.name || !sm.account) continue;
        await this.prisma.employees_has_social_media.create({
          data: {
            employees_id: id,
            media_name: sm.name,
            account_name: sm.account,
          },
        });
      }
    }

    await this.prisma.employees_shift.deleteMany({
      where: { employees_id: id },
    });
    if (Array.isArray(shift)) {
      const shiftData = shift.map((s) => ({
        employees_id: id,
        days: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      await this.prisma.employees_shift.createMany({
        data: shiftData,
      });
    }

    await this.prisma.product_commissions.deleteMany({
      where: { employees_id: id },
    });
    await this.prisma.voucher_commissions.deleteMany({
      where: { employees_id: id },
    });

    if (comissions) {
      if (Array.isArray(comissions.productComission)) {
        for (const pc of comissions.productComission) {
          if (!pc.product_id || pc.amount === undefined) continue;
          await this.prisma.product_commissions.create({
            data: {
              employees_id: id,
              is_percent: pc.is_percent ?? false,
              products_id: pc.product_id,
              amount: pc.amount ?? 0,
            },
          });
        }
      }

      if (Array.isArray(comissions.voucherCommission)) {
        for (const vc of comissions.voucherCommission) {
          if (!vc.voucher_id || vc.amount === undefined) continue;
          await this.prisma.voucher_commissions.create({
            data: {
              employees_id: id,
              is_percent: vc.is_percent ?? false,
              voucher_id: vc.voucher_id,
              amount: vc.amount ?? 0,
            },
          });
        }
      }
    }

    return updatedEmployee;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.employees.delete({
      where: { id },
    });
  }
}
