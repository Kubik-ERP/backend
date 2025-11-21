import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { customer as CustomerModel, point_type, Prisma } from '@prisma/client';
import { validate as isUUID } from 'uuid';
import { validateStoreId } from '../../common/helpers/validators.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerPointDto } from './dto/create-customer-point.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { QueryLoyaltyPointsDto } from './dto/query-loyalty-points.dto';
import { UpdateCustomerPointsDto } from './dto/update-customer-points.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }
    try {
      const customerData: any = {
        name: createCustomerDto.name,
        code: createCustomerDto.code,
        number: createCustomerDto.number,
        gender: createCustomerDto.gender,
        email: createCustomerDto.email,
        dob: createCustomerDto.dob
          ? new Date(createCustomerDto.dob)
          : undefined,
        address: createCustomerDto.address,
        stores_id: store_id,
      };

      if (createCustomerDto.tags && createCustomerDto.tags.length > 0) {
        const tagsToConnectOrCreate = await Promise.all(
          createCustomerDto.tags.map(async (tag) => {
            if (!tag.id || tag.id === '') {
              if (!tag.name || tag.name.trim() === '') {
                throw new HttpException(
                  'Tag name is required if tag id is not provided',
                  HttpStatus.BAD_REQUEST,
                );
              }
              const newTag = await this.prisma.tag.create({
                data: { name: tag.name.trim() },
              });
              return { tag_id: newTag.id };
            }
            return { tag_id: tag.id };
          }),
        );

        customerData.customers_has_tag = {
          create: tagsToConnectOrCreate,
        };
      }

      const newCustomer = await this.prisma.customer.create({
        data: customerData,
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
        },
      });

      return newCustomer;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    {
      page = 1,
      limit = 10,
      search,
    }: {
      page?: number;
      limit?: number;
      search?: string;
    },
    header: ICustomRequestHeaders,
  ) {
    const skip = (page - 1) * limit;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const searchCondition: Prisma.customerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { number: { contains: search, mode: 'insensitive' } },
            {
              customers_has_tag: {
                some: {
                  tag: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        }
      : {};

    const whereCondition: Prisma.customerWhereInput = {
      AND: [
        searchCondition,
        {
          stores_id: store_id,
        },
        { deleted_at: null },
      ],
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      }),
      this.prisma.customer.count({
        where: whereCondition,
      }),
    ]);

    return {
      data: customers,
      meta: {
        totalData: total,
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async details(id: string, query: QueryInvoiceDto) {
    const {
      page = 1,
      limit = 10,
      search,
      payment_status,
      order_type,
      start_date,
      end_date,
    } = query;

    const skip = (page - 1) * limit;

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        customers_has_tag: { include: { tag: true } },
        stores: true,
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const invoiceWhere: any = {
      customer_id: id,
    };

    if (search) {
      invoiceWhere.invoice_number = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (payment_status) invoiceWhere.payment_status = payment_status;
    if (order_type && Array.isArray(order_type)) {
      invoiceWhere.order_type = { in: order_type };
    }
    if (start_date && end_date) {
      invoiceWhere.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    } else if (start_date) {
      invoiceWhere.created_at = {
        gte: new Date(start_date),
      };
    } else if (end_date) {
      invoiceWhere.created_at = {
        lte: new Date(end_date),
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });
    const totalData = await this.prisma.invoice.count({
      where: invoiceWhere,
    });

    const paidTotal = invoices
      .filter((inv) => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

    const unpaidTotal = invoices
      .filter((inv) => inv.payment_status === 'unpaid')
      .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

    const totalSales = invoices.length;

    const lastVisited = invoices.length > 0 ? invoices[0].created_at : null;

    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      gender: customer.gender,
      number: customer.number,
      email: customer.email,
      dob: customer.dob,
      address: customer.address,
      paid: paidTotal,
      unpaid: unpaidTotal,
      total_sales: totalSales,
      last_visited: lastVisited,
      tags: customer.customers_has_tag.map((cht) => cht.tag),
      stores: customer.stores,
      invoices: {
        data: invoices,
        meta: {
          total_data: totalData,
          current_page: page,
          page_size: limit,
          total_pages: Math.ceil(totalSales / limit),
        },
      },
    };
  }

  public async loyaltyPoints(id: string, query: QueryLoyaltyPointsDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        customers_has_tag: {
          include: { tag: true },
        },
        stores: true,
        trn_customer_points: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const {
      page = 1,
      limit = 10,
      expiryDate,
      type,
      search,
      orderBy,
      orderDirection,
    } = query;
    const skip = (page - 1) * limit;
    const conditions: Prisma.trn_customer_pointsWhereInput[] = [];
    if (expiryDate) {
      conditions.push({
        expiry_date: {
          gte: new Date(expiryDate),
        },
      });
    }
    if (type) {
      conditions.push({
        type: {
          equals: type,
        },
      });
    }
    if (search) {
      conditions.push({
        notes: {
          contains: search,
          mode: 'insensitive',
        },
      });
    }
    const whereCondition: Prisma.trn_customer_pointsWhereInput = {
      customer_id: id,
      AND: conditions.length > 0 ? conditions : undefined,
    };
    const sortDirection =
      orderDirection?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const orderByMap: Record<string, any> = {
      type: { type: sortDirection },
      expiryDate: { expiry_date: sortDirection },
      value: { value: sortDirection },
      invoice_number: { invoice: { invoice_number: sortDirection } },
      created_at: { invoice: { created_at: sortDirection } },
    };
    const prismaOrderBy = orderByMap[orderBy as string] ?? {
      created_at: 'desc',
    };
    const [totalItems, points] = await this.prisma.$transaction([
      this.prisma.trn_customer_points.count({ where: whereCondition }),
      this.prisma.trn_customer_points.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        include: {
          invoice: true,
          products: true,
        },
        orderBy: prismaOrderBy,
      }),
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      number: customer.number,
      email: customer.email,
      dob: customer.dob,
      address: customer.address,
      tags: customer.customers_has_tag.map((cht) => cht.tag),
      stores: customer.stores,
      points: {
        total: customer.point || 0,
        data: points,
        meta: {
          total: totalItems,
          page,
          limit,
          totalPages,
        },
      },
    };
  }

  async createLoyaltyPoint(type: point_type, dto: CreateCustomerPointDto) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id: dto.customer_id },
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    // Ensure point is initialized to 0 if null
    if (existingCustomer.point === null) {
      await this.prisma.customer.update({
        where: { id: dto.customer_id },
        data: { point: 0 },
      });
    }

    const currentPoint = existingCustomer.point ?? 0;

    if (type === 'point_addition') {
      if (dto.value <= 0) {
        throw new BadRequestException('Invalid point addition');
      }

      await this.prisma.customer.update({
        where: { id: dto.customer_id },
        data: {
          point: {
            increment: dto.value,
          },
        },
      });

      dto.status = 'active';
    }

    if (type === 'point_deduction') {
      if (dto.value <= 0 || currentPoint - dto.value < 0) {
        throw new BadRequestException('Invalid point deduction');
      }

      await this.prisma.customer.update({
        where: { id: dto.customer_id },
        data: {
          point: {
            decrement: dto.value,
          },
        },
      });
    }

    dto.earn_type = 'adjustment';
    const dataToCreate = {
      ...dto,
      type,
    };

    try {
      const result = await this.prisma.trn_customer_points.create({
        data: dataToCreate,
      });
      return result;
    } catch (err) {
      throw new BadRequestException('Failed to create point: ' + err.message);
    }
  }

  async updateLoyaltyPoint(id: string, dto: UpdateCustomerPointsDto) {
    return this.prisma.$transaction(async (tx) => {
      const existingPoints = await tx.trn_customer_points.findUniqueOrThrow({
        where: { id },
      });

      const newValue = dto.value ?? existingPoints.value;

      if (newValue <= 0) {
        throw new BadRequestException('Point value must be positive.');
      }

      if (newValue !== existingPoints.value) {
        const customer = await tx.customer.findUniqueOrThrow({
          where: { id: existingPoints.customer_id },
        });

        // Ensure point is initialized to 0 if null
        if (customer.point === null) {
          await this.prisma.customer.update({
            where: { id: existingPoints.customer_id },
            data: { point: 0 },
          });
        }

        const valueDifference = newValue - existingPoints.value;
        const netPointChange =
          existingPoints.type === 'point_addition'
            ? valueDifference
            : -valueDifference;

        if ((customer.point ?? 0) + netPointChange < 0) {
          throw new BadRequestException(
            'Update rejected. This change would result in a negative point balance.',
          );
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: { point: { increment: netPointChange } },
        });
      }

      return tx.trn_customer_points.update({
        where: { id },
        data: {
          value: newValue,
          expiry_date: dto.expiry_date ?? existingPoints.expiry_date,
          notes: dto.notes ?? existingPoints.notes,
        },
      });
    });
  }

  public async findOne(idOrName: string): Promise<CustomerModel | null> {
    if (isUUID(idOrName)) {
      return await this.prisma.customer.findUnique({
        where: { id: idOrName },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      });
    } else {
      return await this.prisma.customer.findFirst({
        where: {
          name: { contains: idOrName, mode: 'insensitive' },
        },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      });
    }
  }

  public async findMany(
    idOrName: string,
  ): Promise<CustomerModel | CustomerModel[] | null> {
    if (isUUID(idOrName)) {
      return await this.prisma.customer.findUnique({
        where: { id: idOrName },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      });
    } else {
      return await this.prisma.customer.findMany({
        where: {
          name: { contains: idOrName, mode: 'insensitive' },
        },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      });
    }
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Customer not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (updateCustomerDto.tags !== undefined) {
        await this.prisma.customers_has_tag.deleteMany({
          where: { customer_id: id },
        });

        if (updateCustomerDto.tags.length > 0) {
          const tagsToConnectOrCreate = [];

          for (const tag of updateCustomerDto.tags) {
            if (!tag.id || tag.id === '') {
              const newTag = await this.prisma.tag.create({
                data: { name: tag.name },
              });
              tagsToConnectOrCreate.push({ tag_id: newTag.id });
            } else {
              tagsToConnectOrCreate.push({ tag_id: tag.id });
            }
          }

          await this.prisma.customer.update({
            where: { id },
            data: {
              customers_has_tag: {
                create: tagsToConnectOrCreate,
              },
            },
          });
        }
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: {
          name: updateCustomerDto.name ?? existingCustomer.name,
          gender: updateCustomerDto.gender ?? existingCustomer.gender,
          dob: updateCustomerDto.dob
            ? new Date(updateCustomerDto.dob)
            : existingCustomer.dob,
          number: updateCustomerDto.number ?? existingCustomer.number,
          code: updateCustomerDto.code ?? existingCustomer.code,
          email: updateCustomerDto.email ?? existingCustomer.email,
          address: updateCustomerDto.address ?? existingCustomer.address,
        },
        include: {
          customers_has_tag: { include: { tag: true } },
          stores: true,
        },
      });

      return updatedCustomer;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string) {
    try {
      const existingCustomer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          stores: true,
        },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      await this.prisma.customers_has_tag.deleteMany({
        where: { customer_id: id },
      });

      await this.prisma.customer.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      return {
        message: 'Customer deleted successfully',
        data: existingCustomer,
      };
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw new HttpException(
        'Failed to delete customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async queueWaitingListOrder(header: ICustomRequestHeaders) {
    const storeId = validateStoreId(header.store_id);
    const today = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        order_type: 'dine_in',
        store_id: storeId,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        store_id: true,
        customer_id: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment_status: true,
        created_at: true,
        order_type: true,
        invoice_number: true,
        order_status: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    const preparingOrders = invoices.filter(
      (inv) => inv.order_status === 'in_progress',
    );

    const completedOrders = invoices.filter(
      (inv) => inv.order_status === 'completed',
    );

    return {
      preparingOrders,
      completedOrders,
    };
  }

  async findByPhoneNumber(number: string, storeId: string) {
    return this.prisma.customer.findFirst({
      where: {
        number,
        stores_id: storeId,
      },
      include: {
        customers_has_tag: { include: { tag: true } },
        stores: true,
      },
    });
  }
}
