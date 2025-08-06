import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VouchersListDto } from './dto/vouchers-list.dto';
import { Prisma } from '@prisma/client';
import { getStatus } from './vouchers.util';
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
import { parseDDMMYYYY } from 'src/common/helpers/common.helpers';
import { VouchersActiveDto } from './dto/vouchers-active';

@Injectable()
export class VouchersService {
  constructor(private readonly _prisma: PrismaService) {}

  async findActive(query: VouchersActiveDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // --- Filter
    const filters: Prisma.voucherWhereInput = {
      // search by name or promo code
      ...(query.search?.length > 0 && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { promo_code: { contains: query.search, mode: 'insensitive' } },
        ],
      }),

      // active voucher
      start_period: {
        lte: new Date(),
      },
      end_period: {
        gte: new Date(),
      },

      // filter by store_id
      store_id: store_id,

      // OR condition for product filter or apply all
      OR: [
        {
          voucher_has_products: {
            some: {
              products_id: { in: query.productIds },
            },
          },
        },
        {
          is_apply_all_products: true,
        },
      ],
    };

    const vouchers = await this._prisma.voucher.findMany({
      where: filters,
      orderBy: {
        name: 'asc',
      },
    });

    return vouchers;
  }

  async findAll(query: VouchersListDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // --- Filter range active voucher
    const activeVoucherFilter: Prisma.voucherWhereInput = {};
    if (query.startDate || query.endDate) {
      const start = query.startDate
        ? parseDDMMYYYY(query.startDate)
        : undefined;
      const end = query.endDate ? parseDDMMYYYY(query.endDate) : undefined;

      activeVoucherFilter.AND = [
        // Start period before or same as end filter date
        ...(end ? [{ start_period: { lte: end } }] : []),
        // End period after or same as start filter date
        ...(start ? [{ end_period: { gte: start } }] : []),
      ];
    }

    const filters: Prisma.voucherWhereInput = {
      ...activeVoucherFilter,
      store_id,
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
        where: filters,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: orderBy,
      }),
      this._prisma.voucher.count({
        where: filters,
      }),
    ]);

    // --- Add status to items
    const vouchers = items.map((item) => ({
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

  async findOne(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // --- Cari voucher berdasarkan id dan store_id
    const voucher = await this._prisma.voucher.findUnique({
      where: { id, store_id },
    });

    // --- Jika voucher tidak ditemukan, throw error
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }

    let voucher_has_products: any[] = [];
    if (!voucher.is_apply_all_products) {
      voucher_has_products = await this._prisma.voucher_has_products.findMany({
        where: { voucher_id: voucher.id },
        include: {
          products: true,
        },
      });
    }

    return {
      ...voucher,
      voucher_has_products,
    };
  }

  async create(dto: CreateVoucherDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const { hasProducts, ...rest } = dto;

    // Assign ke semua product di store
    if (hasProducts?.type === 'all') {
      // Get semua product yang ada di store
      const storeProducts = await this._prisma.stores_has_products.findMany({
        where: { stores_id: store_id },
        select: { products_id: true },
      });
      hasProducts.products = storeProducts.map(
        (product) => product.products_id,
      );
    }
    // Spesifik product
    else if (hasProducts?.products?.length) {
      // Verify semua product yang dikirim client ada di store
      const storeProductsCount = await this._prisma.stores_has_products.count({
        where: {
          stores_id: store_id,
          products_id: { in: hasProducts.products },
        },
      });

      if (storeProductsCount !== hasProducts.products.length) {
        throw new BadRequestException(
          'Some products do not belong to this store',
        );
      }
    }

    try {
      const voucherCreated = await this._prisma.voucher.create({
        data: {
          // voucher data
          ...toSnakeCase(rest),
          is_apply_all_products: hasProducts?.type === 'all',
          store_id: store_id,
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
      });

      // return dengan voucher_has_products jika voucher apply ke spesifik product
      let voucher_has_products: any[] = [];
      if (!voucherCreated.is_apply_all_products) {
        voucher_has_products = await this._prisma.voucher_has_products.findMany(
          {
            where: { voucher_id: voucherCreated.id },
            include: {
              products: true,
            },
          },
        );
      }

      return {
        ...voucherCreated,
        voucher_has_products,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate promo code ${dto.promoCode}`);
      } else if (error.code === 'P2003') {
        throw new BadRequestException(`Product not found`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateVoucherDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const { hasProducts, ...rest } = dto;

    // --- Verify voucher yang dikirim client ada di store
    const existingVoucher = await this._prisma.voucher.findFirst({
      where: {
        id,
        store_id,
      },
    });

    if (!existingVoucher) {
      throw new BadRequestException(
        'Voucher not found or does not belong to this store',
      );
    }

    let removedProducts: string[] = [];

    // Jika client mengirimkan body hasProducts
    if (hasProducts) {
      // Ambil list product_id yang sudah ada di DB
      const dbVoucherHasProducts =
        await this._prisma.voucher_has_products.findMany({
          where: {
            voucher_id: id,
            products: {
              stores_has_products: {
                some: {
                  stores_id: store_id,
                },
              },
            },
          },
          select: { products_id: true },
        });

      // Jika client mengirim hasProducts.type = 'all'
      // Semua product akan di-assign ke voucher
      if (hasProducts?.type === 'all') {
        const storeProducts = await this._prisma.stores_has_products.findMany({
          where: { stores_id: store_id },
          select: { products_id: true },
        });
        hasProducts.products = storeProducts.map(
          (product) => product.products_id,
        );
      } else if (hasProducts?.products?.length) {
        // Verify semua product yang dikirim client ada di store
        const storeProducts = await this._prisma.stores_has_products.findMany({
          where: {
            stores_id: store_id,
            products_id: { in: hasProducts.products },
          },
        });

        if (storeProducts.length !== hasProducts.products.length) {
          throw new BadRequestException(
            'Some products do not belong to this store',
          );
        }
      }

      // Melakukan komparasi untuk mengetahui product yang di unassign
      const dbProductIds = dbVoucherHasProducts.map((v) => v.products_id);
      const inputProductIds = hasProducts.products ?? [];
      removedProducts = dbProductIds.filter(
        (id) => !inputProductIds.includes(id),
      );
    }

    try {
      const updatedVoucher = await this._prisma.$transaction(async (tx) => {
        // Update voucher data
        const voucherUpdated = await tx.voucher.update({
          where: { id },
          data: {
            ...toSnakeCase(rest),
            is_apply_all_products: hasProducts?.type === 'all',
            updated_at: new Date(),
          },
          include: {
            voucher_has_products: {
              include: {
                products: true,
              },
            },
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

        // return dengan voucher_has_products jika voucher apply ke spesifik product
        let voucher_has_products: any[] = [];
        if (!voucherUpdated.is_apply_all_products) {
          voucher_has_products = await tx.voucher_has_products.findMany({
            where: { voucher_id: voucherUpdated.id },
            include: {
              products: true,
            },
          });
        }

        return {
          ...voucherUpdated,
          voucher_has_products,
        };
      });

      return updatedVoucher;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate promo code ${dto.promoCode}`);
      } else if (error.code === 'P2003') {
        throw new BadRequestException(`Product not found`);
      }
      throw error;
    }
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    await this._prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.findUnique({
        where: { id, store_id },
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
