import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage-service/services/storage-service.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { FindAllEmployeeQueryDto } from './dto/find-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeCommissionsListDto } from './dto/employee-commissions-list.dto';
import {
  convertToIsoDate,
  requireStoreId,
} from 'src/common/helpers/common.helpers';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';

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
                stores_id: store_id,
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

  async findCommissions(
    id: string,
    query: EmployeeCommissionsListDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);

    // --- Filter range active voucher
    const whereClause: Prisma.employee_commission_logsWhereInput = {
      employee_id: id,
    };

    if (query.startDate || query.endDate) {
      const start = query.startDate
        ? convertToIsoDate(query.startDate)
        : undefined;
      const end = query.endDate ? convertToIsoDate(query.endDate) : undefined;

      whereClause.AND = [
        // Start period before or same as end filter date
        ...(end ? [{ created_at: { lte: new Date(end) } }] : []),
        // End period after or same as start filter date
        ...(start ? [{ created_at: { gte: new Date(start) } }] : []),
      ];
    }

    // filter sourceType
    if (query.sourceType) {
      whereClause.source_type = query.sourceType;
    }

    const filters: Prisma.employee_commission_logsWhereInput = {
      ...whereClause,
      employees: {
        stores_id: store_id,
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.employee_commission_logs.findMany({
        where: whereClause,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: [{ created_at: 'desc' }],
        include: {
          voucher: {
            select: {
              name: true,
            },
          },
          invoice: {
            select: {
              invoice_number: true,
              paid_at: true,
            },
          },
          invoice_details: {
            select: {
              products: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.employee_commission_logs.count({
        where: filters,
      }),
    ]);

    // --- Add status to items
    const data = items.map((item) => {
      const name = item.invoice_details?.products?.name || item.voucher?.name;

      return {
        id: item.id,
        invoiceNumber: item.invoice?.invoice_number,
        paidAt: item.invoice?.paid_at,
        sourceType: item.source_type,
        commissionAmount: item.commission_amount,
        name,
      };
    });

    return {
      items: data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  async findAll(query: FindAllEmployeeQueryDto, header: ICustomRequestHeaders) {
    const {
      page = 1,
      limit = 10,
      search,
      title,
      permission,
      store_ids,
      orderBy,
      orderDirection,
    } = query;
    const skip = (page - 1) * limit;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    let storeIds = [];
    if (store_ids) {
      storeIds = store_ids?.split(',') || [];
    } else {
      storeIds.push(store_id);
    }

    console.log(storeIds);

    const conditions: Prisma.employeesWhereInput[] = [];
    let orderByClause = {};
    if (orderBy) {
      orderByClause = {
        [orderBy]: orderDirection || 'asc',
      };
    } else {
      orderByClause = { created_at: 'desc' };
    }

    conditions.push({
      stores_id: { in: storeIds },
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

      // Handle product commissions with upsert logic
      if (commissions && Array.isArray(commissions.productCommission)) {
        // Get existing product commissions
        const existingProductCommissions =
          await tx.product_commissions.findMany({
            where: { employees_id: id },
            include: {
              employee_commission_logs: {
                select: { id: true },
              },
            },
          });

        // Track which commissions are being updated/created
        const processedProductIds = new Set<string>();

        for (const pc of commissions.productCommission) {
          if (!pc.product_id || pc.amount === undefined) continue;

          processedProductIds.add(pc.product_id);

          // Check if commission already exists
          const existingCommission = existingProductCommissions.find(
            (ec) => ec.products_id === pc.product_id,
          );

          if (existingCommission) {
            // Update existing commission
            await tx.product_commissions.update({
              where: { id: existingCommission.id },
              data: {
                is_percent: pc.is_percent ?? false,
                amount: pc.amount ?? 0,
              },
            });
          } else {
            // Create new commission
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

        // Delete commissions that are no longer needed (only if they don't have commission logs)
        const commissionsToDelete = existingProductCommissions.filter(
          (ec) =>
            !processedProductIds.has(ec.products_id) &&
            ec.employee_commission_logs.length === 0,
        );

        for (const commission of commissionsToDelete) {
          await tx.product_commissions.delete({
            where: { id: commission.id },
          });
        }
      } else {
        // If no product commissions provided, delete existing ones (only if they don't have commission logs)
        const existingProductCommissions =
          await tx.product_commissions.findMany({
            where: { employees_id: id },
            include: {
              employee_commission_logs: {
                select: { id: true },
              },
            },
          });

        const commissionsToDelete = existingProductCommissions.filter(
          (ec) => ec.employee_commission_logs.length === 0,
        );

        for (const commission of commissionsToDelete) {
          await tx.product_commissions.delete({
            where: { id: commission.id },
          });
        }
      }

      // Handle voucher commissions with upsert logic
      if (commissions && Array.isArray(commissions.voucherCommission)) {
        // Get existing voucher commissions
        const existingVoucherCommissions =
          await tx.voucher_commissions.findMany({
            where: { employees_id: id },
            include: {
              employee_commission_logs: {
                select: { id: true },
              },
            },
          });

        // Track which commissions are being updated/created
        const processedVoucherIds = new Set<string>();

        for (const vc of commissions.voucherCommission) {
          if (!vc.voucher_id || vc.amount === undefined) continue;

          processedVoucherIds.add(vc.voucher_id);

          // Check if commission already exists
          const existingCommission = existingVoucherCommissions.find(
            (ec) => ec.voucher_id === vc.voucher_id,
          );

          if (existingCommission) {
            // Update existing commission
            await tx.voucher_commissions.update({
              where: { id: existingCommission.id },
              data: {
                is_percent: vc.is_percent ?? false,
                amount: vc.amount ?? 0,
              },
            });
          } else {
            // Create new commission
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

        // Delete commissions that are no longer needed (only if they don't have commission logs)
        const commissionsToDelete = existingVoucherCommissions.filter(
          (ec) =>
            !processedVoucherIds.has(ec.voucher_id) &&
            ec.employee_commission_logs.length === 0,
        );

        for (const commission of commissionsToDelete) {
          await tx.voucher_commissions.delete({
            where: { id: commission.id },
          });
        }
      } else {
        // If no voucher commissions provided, delete existing ones (only if they don't have commission logs)
        const existingVoucherCommissions =
          await tx.voucher_commissions.findMany({
            where: { employees_id: id },
            include: {
              employee_commission_logs: {
                select: { id: true },
              },
            },
          });

        const commissionsToDelete = existingVoucherCommissions.filter(
          (ec) => ec.employee_commission_logs.length === 0,
        );

        for (const commission of commissionsToDelete) {
          await tx.voucher_commissions.delete({
            where: { id: commission.id },
          });
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

  // async assignToStore(
  //   assignEmployeeDto: AssignEmployeeDto,
  //   req: ICustomRequestHeaders,
  // ) {
  //   const { employeeId, type } = assignEmployeeDto;
  //   const storeId = req.store_id;
  //   if (!storeId) {
  //     throw new BadRequestException('Store ID is required');
  //   }

  //   const employee = await this.findOne(employeeId);
  //   if (!employee) {
  //     throw new NotFoundException(`Employee with ID ${employeeId} not found`);
  //   }

  //   const existingAssignment = await this.prisma.employees.findFirst({
  //     where: {
  //       AND: [{ id: employeeId }, { stores_id: storeId }],
  //     },
  //   });

  //   if (type === 'ASSIGN') {
  //     if (existingAssignment) {
  //       throw new BadRequestException(
  //         `Employee with ID ${employeeId} is already assigned to store ${storeId}`,
  //       );
  //     }

  //     await this.prisma.stores_has_employees.create({
  //       data: {
  //         employees_id: employeeId,
  //         stores_id: storeId,
  //       },
  //     });

  //     return {
  //       message: 'Employee assigned to store successfully',
  //     };
  //   } else {
  //     if (!existingAssignment) {
  //       throw new BadRequestException(
  //         `Employee with ID ${employeeId} is not assigned to store ${storeId}`,
  //       );
  //     }
  //     await this.prisma.stores_has_employees.deleteMany({
  //       where: {
  //         AND: [{ employees_id: employeeId }, { stores_id: storeId }],
  //       },
  //     });
  //     return {
  //       message: 'Employee unassigned from store successfully',
  //     };
  //   }
  // }
}
