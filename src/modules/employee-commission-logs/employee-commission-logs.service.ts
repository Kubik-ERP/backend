import { Injectable, Logger } from '@nestjs/common';
import { CreateEmployeeCommissionLogDto } from './dto/create-employee-commission-log.dto';
import { UpdateEmployeeCommissionLogDto } from './dto/update-employee-commission-log.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  convertToIsoDate,
  requireStoreId,
} from 'src/common/helpers/common.helpers';
import { EmployeeCommissionLogsListDto } from './dto/employee-commission-logs-list.dto';
import { Prisma } from '@prisma/client';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';

@Injectable()
export class EmployeeCommissionLogsService {
  private readonly logger = new Logger(EmployeeCommissionLogsService.name);

  constructor(private readonly _prisma: PrismaService) {}

  create(createEmployeeCommissionLogDto: CreateEmployeeCommissionLogDto) {
    return 'This action adds a new employeeCommissionLog';
  }

  async findAll(
    query: EmployeeCommissionLogsListDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);

    // --- Filter range active voucher
    const employeeCommissionLogsFilter: Prisma.employee_commission_logsWhereInput =
      {};
    if (query.startDate || query.endDate) {
      const start = query.startDate
        ? convertToIsoDate(query.startDate)
        : undefined;
      const end = query.endDate ? convertToIsoDate(query.endDate) : undefined;

      employeeCommissionLogsFilter.AND = [
        // Start period before or same as end filter date
        ...(end ? [{ created_at: { lte: new Date(end) } }] : []),
        // End period after or same as start filter date
        ...(start ? [{ created_at: { gte: new Date(start) } }] : []),
      ];
    }

    const filters: Prisma.employee_commission_logsWhereInput = {
      ...employeeCommissionLogsFilter,
      employees: {
        stores_id: store_id,
      },
    };

    const [items, total] = await Promise.all([
      this._prisma.employee_commission_logs.findMany({
        where: filters,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: [{ created_at: 'desc' }],
        include: {
          invoice_details: {
            select: {
              invoice: {
                select: {
                  invoice_number: true,
                  paid_at: true,
                },
              },
            },
          },
        },
      }),
      this._prisma.employee_commission_logs.count({
        where: filters,
      }),
    ]);

    // --- Add status to items
    const data = items.map((item) => ({
      id: item.id,
      invoiceNumber: item.invoice_details?.invoice?.invoice_number,
      paidAt: item.invoice_details?.invoice?.paid_at,
      sourceType: item.source_type,
      commissionAmount: item.commission_amount,
    }));

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

  findOne(id: number) {
    return `This action returns a #${id} employeeCommissionLog`;
  }

  update(
    id: number,
    updateEmployeeCommissionLogDto: UpdateEmployeeCommissionLogDto,
  ) {
    return `This action updates a #${id} employeeCommissionLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} employeeCommissionLog`;
  }
}
