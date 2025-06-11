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
import { customer as CustomerModel } from '@prisma/client';

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
        tag: createCustomerDto.tag,
      };

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
    search = '',
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
          customers_has_invoices: {
            include: {
              invoice: true,
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

    const customersWithLastVisit = customers.map((customer) => {
      const lastVisit = customer.customers_has_invoices.reduce(
        (latest: Date | null, current) => {
          const currentDate = current.invoice?.created_at
            ? new Date(current.invoice.created_at)
            : null;

          if (!currentDate) return latest;
          if (!latest || currentDate > latest) return currentDate;
          return latest;
        },
        null,
      );

      return {
        ...customer,
        lastVisit,
      };
    });

    return {
      customers: customersWithLastVisit,
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
        customers_has_invoices: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paidTotal = customer.customers_has_invoices
      .filter((chi) => chi.invoice?.payment_status === 'paid')
      .reduce((sum, chi) => sum + (chi.invoice?.subtotal || 0), 0);

    const unpaidTotal = customer.customers_has_invoices
      .filter((chi) => chi.invoice?.payment_status === 'unpaid')
      .reduce((sum, chi) => sum + (chi.invoice?.subtotal || 0), 0);

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
      tags: customer.customers_has_tag.map((cht) => cht.tag),
      stores: customer.customer_has_stores.map((chs) => chs.stores),
      invoices: customer.customers_has_invoices.map((chi) => chi.invoice),
    };
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
        tag: updateCustomerDto.tag,
      };

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
