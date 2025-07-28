import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { validate as isUUID } from 'uuid';
import { customer as CustomerModel, point_type, Prisma } from '@prisma/client';
import { CreateCustomerPointDto } from './dto/create-customer-point.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { validateStoreId } from '../../common/helpers/validators.helper';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
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
          customer_has_stores: {
            include: {
              stores: true,
            },
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

  async findAll({
    page = 1,
    limit = 10,
    search,
  }: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const skip = (page - 1) * limit;

    const searchCondition = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              email: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              number: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              customers_has_tag: {
                some: {
                  tag: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: searchCondition,
        skip,
        take: limit,
        include: {
          customers_has_tag: {
            include: {
              tag: true,
            },
          },
          customer_has_stores: {
            include: {
              stores: true,
            },
          },
        },
      }),
      this.prisma.customer.count({
        where: searchCondition,
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
        customer_has_stores: { include: { stores: true } },
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
      stores: customer.customer_has_stores.map((chs) => chs.stores),
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

  public async loyaltyPoints(id: string): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        customers_has_tag: {
          include: { tag: true },
        },
        customer_has_stores: {
          include: { stores: true },
        },
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
    const totalPoints = customer.trn_customer_points.reduce((sum, point) => {
      if (point.type?.toString() === 'point_deduction') {
        return sum - point.value;
      } else {
        return sum + point.value;
      }
    }, 0);

    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      number: customer.number,
      email: customer.email,
      dob: customer.dob,
      address: customer.address,
      tags: customer.customers_has_tag.map((cht) => cht.tag),
      stores: customer.customer_has_stores.map((chs) => chs.stores),
      points: {
        total: totalPoints,
        details: customer.trn_customer_points,
      },
    };
  }

  async createLoyaltyPoint(dto: CreateCustomerPointDto) {
    try {
      const result = await this.prisma.trn_customer_points.create({
        data: dto,
      });
      return result;
    } catch (err) {
      throw new BadRequestException('Failed to create point: ' + err.message);
    }
  }

  public async findOne(idOrName: string): Promise<CustomerModel | null> {
    if (isUUID(idOrName)) {
      return await this.prisma.customer.findUnique({
        where: { id: idOrName },
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          customer_has_stores: {
            include: { stores: true },
          },
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
          customer_has_stores: {
            include: { stores: true },
          },
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
          customer_has_stores: {
            include: { stores: true },
          },
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
          customer_has_stores: {
            include: { stores: true },
          },
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

      const customerData: any = {
        name: updateCustomerDto.name,
        code: updateCustomerDto.code,
        number: updateCustomerDto.number,
        email: updateCustomerDto.email,
        dob: updateCustomerDto.dob
          ? new Date(updateCustomerDto.dob)
          : undefined,
        address: updateCustomerDto.address,
      };

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
        data: customerData,
        include: {
          customers_has_tag: { include: { tag: true } },
          customer_has_stores: { include: { stores: true } },
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
          customer_has_stores: {
            include: { stores: true },
          },
        },
      });

      if (!existingCustomer) {
        throw new NotFoundException('Customer not found');
      }

      await this.prisma.customers_has_tag.deleteMany({
        where: { customer_id: id },
      });

      await this.prisma.customer.delete({
        where: { id },
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
}
