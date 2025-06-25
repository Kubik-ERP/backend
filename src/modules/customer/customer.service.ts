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

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {},
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
        where: search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {},
      }),
    ]);

    return {
      data: customers,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  public async details(id: string): Promise<any> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        customers_has_tag: {
          include: { tag: true },
        },
        customer_has_stores: {
          include: { stores: true },
        },
        invoice: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paidTotal = customer.invoice
      .filter((inv) => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

    const unpaidTotal = customer.invoice
      .filter((inv) => inv.payment_status === 'unpaid')
      .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

    const totalSales = customer.invoice.length;

    const lastVisited =
      customer.invoice.length > 0 ? customer.invoice[0].created_at : null;

    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
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
      invoices: customer.invoice,
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

      if (updateCustomerDto.tags && updateCustomerDto.tags.length > 0) {
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

        await this.prisma.customers_has_tag.deleteMany({
          where: { customer_id: id },
        });

        customerData.customers_has_tag = {
          create: tagsToConnectOrCreate,
        };
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: customerData,
        include: {
          customers_has_tag: {
            include: { tag: true },
          },
          customer_has_stores: {
            include: { stores: true },
          },
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
}
