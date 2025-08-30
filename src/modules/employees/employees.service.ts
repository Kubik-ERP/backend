import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage-service/services/storage-service.service';
import { AssignEmployeeDto } from './dto/assign-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { FindAllEmployeeQueryDto } from './dto/find-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    dto: CreateEmployeeDto,
    header: ICustomRequestHeaders,
    file?: Express.Multer.File,
  ) {
    const {
      name,
      email,
      phoneCode,
      phoneNumber,
      startDate,
      endDate,
      gender,
      title,
      permission,
      socialMedia,
      shift,
      commissions,
    } = dto;
    const store_id = header.store_id;
    let profilePicture = null;

    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );

      profilePicture = result.filename;
    }

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const existingEmployee = await this.prisma.employees.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      throw new BadRequestException(`Email "${email}" is already in use.`);
    }

    const { employee, insertedProductCommissions, insertedVoucherCommissions } =
      await this.prisma.$transaction(async (tx) => {
        // user dibuat untuk keperluan login
        const user = await tx.users.create({
          data: {
            is_staff: true,
            email: email || '',
            password: '-',
            phone: phoneNumber,
            pin: '-',
            fullname: name,
            role_id: permission,
            picture_url: profilePicture,
            employees: {
              create: {
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
                default_commission_product: dto.defaultCommissionProduct,
                default_commission_product_type:
                  dto.defaultCommissionProductType,
                default_commission_voucher: dto.defaultCommissionVoucher,
                default_commission_voucher_type:
                  dto.defaultCommissionVoucherType,
                // assign ke store
                stores_has_employees: {
                  create: {
                    stores_id: store_id,
                  },
                },
              },
            },
          },
          include: {
            employees: true,
          },
        });
        const employee = user.employees;
        if (!employee) {
          throw new BadRequestException('Failed to create employee');
        }

        const employeeId = employee.id;

        // Social media
        try {
          if (socialMedia && socialMedia.length > 0) {
            const socialMediaData = socialMedia.map((sm) => ({
              employees_id: employeeId,
              media_name: sm.name,
              account_name: sm.account,
            }));
            await tx.employees_has_social_media.createMany({
              data: socialMediaData,
            });
          }
        } catch (error) {
          console.error('Error inserting social media:', error);
        }

        if (shift && shift.length > 0) {
          shift.map((s) => {
            return tx.employees_shift.create({
              data: {
                employees_id: employeeId,
                days: s.day,
                start_time: s.start_time,
                end_time: s.end_time,
              },
            });
          });
        }

        // Shift
        if (Array.isArray(shift)) {
          const shiftData = shift.map((s) => ({
            employees_id: employeeId,
            days: s.day,
            start_time: s.start_time,
            end_time: s.end_time,
          }));

          await tx.employees_shift.createMany({
            data: shiftData,
          });
        }

        // Commissions
        const insertedProductCommissions = [];
        const insertedVoucherCommissions = [];

        if (commissions) {
          // Product Commissions
          if (
            Array.isArray(commissions.productCommission) &&
            commissions.productCommission.length > 0
          ) {
            for (const pc of commissions.productCommission) {
              if (!pc.product_id || pc.amount === undefined) continue;

              try {
                const result = await tx.product_commissions.create({
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
            Array.isArray(commissions.voucherCommission) &&
            commissions.voucherCommission.length > 0
          ) {
            for (const vc of commissions.voucherCommission) {
              if (!vc.voucher_id || vc.amount === undefined) continue;

              try {
                const result = await tx.voucher_commissions.create({
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
          employee,
          insertedProductCommissions,
          insertedVoucherCommissions,
        };
      });

    return {
      employee: employee,
      socialMedia,
      shift,
      productCommissions: insertedProductCommissions,
      voucherCommissions: insertedVoucherCommissions,
    };
  }

  async findAll(query: FindAllEmployeeQueryDto, header: ICustomRequestHeaders) {
    const {
      page = 1,
      limit = 10,
      search,
      title,
      permission,
      orderBy,
      orderDirection,
    } = query;
    const skip = (page - 1) * limit;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const conditions: Prisma.employeesWhereInput[] = [];
    let orderByClause = {};
    if (orderBy) {
      orderByClause = {
        [orderBy]: orderDirection || 'asc',
      };
    }

    conditions.push({
      stores_has_employees: {
        some: {
          stores_id: store_id,
        },
      },
    });

    if (search) {
      conditions.push({
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            phone_number: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (title) {
      conditions.push({
        title: {
          contains: title,
          mode: 'insensitive',
        },
      });
    }

    if (permission && permission.length > 0) {
      conditions.push({
        permission: {
          in: permission,
        },
      });
    }
    const whereClause: Prisma.employeesWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [totalItems, employees] = await this.prisma.$transaction([
      this.prisma.employees.count({ where: whereClause }),
      this.prisma.employees.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          employees_has_roles: { include: { roles: true } },
          employees_has_social_media: true,
          employees_shift: true,
          product_commissions: true,
          voucher_commissions: true,
          stores_has_employees: true,
        },
      }),
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      employees,
      meta: {
        total: totalItems,
        page,
        limit,
        totalPages,
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

  async update(id: string, dto: UpdateEmployeeDto, file?: Express.Multer.File) {
    const {
      name,
      email,
      phoneCode,
      phoneNumber,
      startDate,
      endDate,
      gender,
      title,
      permission,
      socialMedia,
      shift,
      commissions,
    } = dto;

    const existing = await this.prisma.employees.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    let profilePicture = existing.profile_url;
    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );

      profilePicture = result.filename;
    }

    const updatedEmployee = await this.prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employees.update({
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
          default_commission_product: dto.defaultCommissionProduct,
          default_commission_product_type: dto.defaultCommissionProductType,
          default_commission_voucher: dto.defaultCommissionVoucher,
          default_commission_voucher_type: dto.defaultCommissionVoucherType,
        },
      });

      // update user biar datanya sama dengan employee
      await tx.users.update({
        where: { id: updatedEmployee.user_id },
        data: {
          fullname: name,
          email,
          phone: phoneNumber,
          picture_url: profilePicture,
          role_id: permission,
        },
      });

      await tx.employees_has_social_media.deleteMany({
        where: { employees_id: id },
      });
      if (Array.isArray(socialMedia)) {
        for (const sm of socialMedia) {
          await tx.employees_has_social_media.create({
            data: {
              employees_id: id,
              media_name: sm.name,
              account_name: sm.account,
            },
          });
        }
      }

      await tx.employees_shift.deleteMany({
        where: { employees_id: id },
      });
      if (Array.isArray(shift)) {
        const shiftData = shift.map((s) => ({
          employees_id: id,
          days: s.day,
          start_time: s.start_time,
          end_time: s.end_time,
        }));

        await tx.employees_shift.createMany({
          data: shiftData,
        });
      }

      await tx.product_commissions.deleteMany({
        where: { employees_id: id },
      });
      await tx.voucher_commissions.deleteMany({
        where: { employees_id: id },
      });

      if (commissions) {
        if (Array.isArray(commissions.productCommission)) {
          for (const pc of commissions.productCommission) {
            if (!pc.product_id || pc.amount === undefined) continue;
            await tx.product_commissions.create({
              data: {
                employees_id: id,
                is_percent: pc.is_percent ?? false,
                products_id: pc.product_id,
                amount: pc.amount ?? 0,
              },
            });
          }
        }

        if (Array.isArray(commissions.voucherCommission)) {
          for (const vc of commissions.voucherCommission) {
            if (!vc.voucher_id || vc.amount === undefined) continue;
            await tx.voucher_commissions.create({
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
    });
    return updatedEmployee;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const deletedEmployee = await tx.employees.delete({
        where: { id },
      });

      await tx.users.delete({
        where: { id: deletedEmployee.user_id },
      });

      return deletedEmployee;
    });
  }

  async assignToStore(
    assignEmployeeDto: AssignEmployeeDto,
    req: ICustomRequestHeaders,
  ) {
    const { employeeId, type } = assignEmployeeDto;
    const storeId = req.store_id;
    if (!storeId) {
      throw new BadRequestException('Store ID is required');
    }

    const employee = await this.findOne(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const existingAssignment = await this.prisma.stores_has_employees.findFirst(
      {
        where: {
          AND: [{ employees_id: employeeId }, { stores_id: storeId }],
        },
      },
    );

    if (type === 'ASSIGN') {
      if (existingAssignment) {
        throw new BadRequestException(
          `Employee with ID ${employeeId} is already assigned to store ${storeId}`,
        );
      }

      await this.prisma.stores_has_employees.create({
        data: {
          employees_id: employeeId,
          stores_id: storeId,
        },
      });

      return {
        message: 'Employee assigned to store successfully',
      };
    } else {
      if (!existingAssignment) {
        throw new BadRequestException(
          `Employee with ID ${employeeId} is not assigned to store ${storeId}`,
        );
      }
      await this.prisma.stores_has_employees.deleteMany({
        where: {
          AND: [{ employees_id: employeeId }, { stores_id: storeId }],
        },
      });
      return {
        message: 'Employee unassigned from store successfully',
      };
    }
  }
}
