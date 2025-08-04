import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VouchersListDto } from './dto/vouchers-list.dto';
import { Prisma } from '@prisma/client';
import { getStatus } from './vouchers.util';
import { IVoucher } from './interfaces/vouchers.interface';
import {
  camelToSnake,
  toSnakeCase,
} from 'src/common/helpers/object-transformer.helper';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';

@Injectable()
export class VouchersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(query: VouchersListDto) {
    // --- Filter
    const createdAtFilter: Record<string, Date> = {};
    if (query.startDate) {
      createdAtFilter.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      createdAtFilter.lte = new Date(query.endDate);
    }

    const filters: Prisma.voucherWhereInput = {
      // filter range by created at
      ...(Object.keys(createdAtFilter).length > 0 && {
        created_at: createdAtFilter,
      }),
    };

    // --- Order By
    const orderByField = camelToSnake(query.orderBy);
    const orderDirection = query.orderDirection;
    const orderBy: Prisma.voucherOrderByWithRelationInput[] =
      orderByField === 'validity_period'
        ? [
            {
              start_period: orderDirection,
            },
            {
              end_period: orderDirection,
            },
          ]
        : [
            {
              [orderByField]: orderDirection,
            },
          ];

    const [items, total] = await Promise.all([
      this._prisma.voucher.findMany({
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: orderBy,
      }),
      this._prisma.voucher.count({
        where: filters,
      }),
    ]);

    // --- Add status to items
    const vouchers = items.map((item: IVoucher) => ({
      ...item,
      status: getStatus(item),
    }));

    return {
      items: vouchers,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  async findOne(id: string) {
    const voucher = await this._prisma.voucher.findUnique({
      where: { id },
      include: {
        voucher_has_products: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    return voucher;
  }

  async create(dto: CreateVoucherDto) {
    const { hasProducts, ...rest } = dto;

    if (hasProducts?.type === 'all') {
      const products = await this._prisma.products.findMany();
      hasProducts.products = products.map((product) => product.id);
    }

    try {
      const voucher = await this._prisma.voucher.create({
        data: {
          // voucher data
          ...toSnakeCase(rest),
          updated_at: new Date(),

          // voucher has products data
          ...(hasProducts?.products?.length && {
            voucher_has_products: {
              createMany: {
                data: hasProducts.products.map((product) => ({
                  products_id: product,
                })),
              },
            },
          }),
        },

        // return with voucher has products, products data
        include: {
          voucher_has_products: {
            include: {
              products: true,
            },
          },
        },
      });

      return voucher;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate promo code ${dto.promoCode}`);
      } else if (error.code === 'P2003') {
        throw new BadRequestException(`Product not found`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const { hasProducts, ...rest } = dto;

    let removedProducts: string[] = [];

    // Jika client mengirimkan body hasProducts
    if (hasProducts) {
      // Ambil list product_id yang sudah ada di DB
      const dbVoucherHasProducts =
        await this._prisma.voucher_has_products.findMany({
          where: { voucher_id: id },
          select: { products_id: true },
        });

      // Jika client mengirim hasProducts.type = 'all'
      // Semua product akan di-assign ke voucher
      if (hasProducts?.type === 'all') {
        const products = await this._prisma.products.findMany({
          select: { id: true },
        });
        hasProducts.products = products.map((product) => product.id);
      }

      // Melakukan komparasi untuk mengetahui product yang di unassign
      const dbProductIds = dbVoucherHasProducts.map((v) => v.products_id);
      const inputProductIds = hasProducts.products ?? [];
      removedProducts = dbProductIds.filter(
        (id) => !inputProductIds.includes(id),
      );
    }

    try {
      this._prisma.$transaction(async (tx) => {
        // Update voucher data
        const voucher = await tx.voucher.update({
          where: { id },
          data: {
            ...toSnakeCase(rest),
            updated_at: new Date(),
          },
        });

        // Jika client mengirimkan body hasProducts
        if (hasProducts) {
          // Melakukan upsert untuk product yang akan diassign ke voucher
          const promises = hasProducts.products.map((product) => {
            return tx.voucher_has_products.upsert({
              where: {
                voucher_id_products_id: {
                  voucher_id: id,
                  products_id: product,
                },
              },
              update: {
                voucher_id: id,
                products_id: product,
              },
              create: {
                voucher_id: id,
                products_id: product,
              },
            });
          });
          await Promise.all(promises);

          // Menghapus product yang diunassign
          if (removedProducts.length > 0) {
            await tx.voucher_has_products.deleteMany({
              where: {
                voucher_id: id,
                products_id: { in: removedProducts },
              },
            });
          }
        }

        return voucher;
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate promo code ${dto.promoCode}`);
      } else if (error.code === 'P2003') {
        throw new BadRequestException(`Product not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this._prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({
        where: { id },
      });

      if (!voucher) {
        throw new BadRequestException(`Voucher with ID ${id} not found`);
      }

      await tx.voucher_has_products.deleteMany({
        where: { voucher_id: id },
      });
      await tx.voucher.delete({
        where: { id },
      });
    });
  }
}
