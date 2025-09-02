import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VouchersListDto } from './dto/vouchers-list.dto';
import { Prisma } from '@prisma/client';
import { getStatus, isVoucherActive } from './vouchers.util';
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
import {
  jakartaTime,
  convertToIsoDate,
  percentageToAmount,
  requireStoreId,
} from 'src/common/helpers/common.helpers';
import { VouchersActiveDto } from './dto/vouchers-active';

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(private readonly _prisma: PrismaService) {}

  async findActive(query: VouchersActiveDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    const today = jakartaTime().toFormat('yyyy-MM-dd');

    // --- Filter
    const filters: Prisma.voucherWhereInput = {
      // voucher yang kuotanya habis akan di hide
      quota: {
        gt: 0,
      },
      // active voucher
      start_period: {
        lte: new Date(today),
      },
      end_period: {
        gte: new Date(today),
      },

      // filter by store_id
      store_id: store_id,

      AND: [
        {
          // search by name or promo code
          ...(query.search?.length > 0 && {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { promo_code: { contains: query.search, mode: 'insensitive' } },
            ],
          }),
        },
        {
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
    const store_id = requireStoreId(header);

    // --- Filter range active voucher
    const activeVoucherFilter: Prisma.voucherWhereInput = {};
    if (query.startDate || query.endDate) {
      const start = query.startDate
        ? convertToIsoDate(query.startDate)
        : undefined;
      const end = query.endDate ? convertToIsoDate(query.endDate) : undefined;

      activeVoucherFilter.AND = [
        // Start period before or same as end filter date
        ...(end ? [{ start_period: { lte: new Date(end) } }] : []),
        // End period after or same as start filter date
        ...(start ? [{ end_period: { gte: new Date(start) } }] : []),
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
        include: {
          // Untuk mengetahui apakah voucher ini sudah di apply ke invoice
          invoice: {
            select: {
              voucher_id: true,
            },
            take: 1,
          },
        },
      }),
      this._prisma.voucher.count({
        where: filters,
      }),
    ]);

    // --- Add status to items
    const vouchers = items.map((item) => ({
      ...item,
      status: getStatus(item),
      is_applied: item.invoice.length > 0,
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
    const store_id = requireStoreId(header);

    // --- Cari voucher berdasarkan id dan store_id
    const voucher = await this._prisma.voucher.findUnique({
      where: { id, store_id },
      include: {
        // Untuk mengetahui apakah voucher ini sudah di apply ke invoice
        invoice: {
          select: {
            voucher_id: true,
          },
          take: 1,
        },
      },
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
          products: {
            include: {
              categories_has_products: {
                select: {
                  categories: {
                    select: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return {
      ...voucher,
      voucher_has_products,
      is_applied: voucher.invoice.length > 0,
    };
  }

  async create(dto: CreateVoucherDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Creating new voucher for store ${store_id}`);

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

      const result = {
        ...voucherCreated,
        voucher_has_products,
      };
      this.logger.log(
        `Successfully created voucher with promo code ${voucherCreated.promo_code}`,
      );
      return result;
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
    const store_id = requireStoreId(header);
    this.logger.log(`Updating voucher ${id} for store ${store_id}`);

    const { hasProducts, ...rest } = dto;

    // --- Memastikan voucher ada di store
    const isVoucherExist = await this.isVoucherExist(id, store_id);
    if (!isVoucherExist) {
      throw new BadRequestException(`Voucher with ID ${id} not found`);
    }

    // --- Memastikan voucher belum pernah di apply ke invoice
    const isVoucherApplied = await this.isVoucherApplied(id);
    if (isVoucherApplied) {
      throw new BadRequestException(
        'Voucher has already been applied to an invoice',
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

      this.logger.log(`Successfully updated voucher ${id}`);
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
    const store_id = requireStoreId(header);
    this.logger.log(`Removing voucher ${id} from store ${store_id}`);

    // --- Memastikan voucher ada di store
    const isVoucherExist = await this.isVoucherExist(id, store_id);
    if (!isVoucherExist) {
      throw new BadRequestException(`Voucher with ID ${id} not found`);
    }

    // --- Memastikan voucher belum pernah di apply ke invoice
    const isVoucherApplied = await this.isVoucherApplied(id);
    if (isVoucherApplied) {
      throw new BadRequestException(
        'Voucher has already been applied to an invoice',
      );
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
      this.logger.log(`Successfully removed voucher ${id}`);
    });
  }

  /**
   * Calculate voucher amount
   *
   * @param voucherId - Voucher ID
   * @param productIds - Product IDs
   * @param grandTotal - Grand total (after discount)
   * @returns {voucherAmount: number, grandTotal: number}
   */
  async voucherCalculation(
    voucherId: string,
    productIds: string[],
    grandTotal: number,
    isCalculate = false,
  ) {
    let voucherAmount = 0;
    // check valid voucher
    const voucher = await this._prisma.voucher.findUnique({
      where: {
        id: voucherId,

        // memastikan voucher berlaku untuk salah satu product yang di checkout
        voucher_has_products: {
          some: {
            products_id: {
              in: productIds,
            },
          },
        },
      },
    });

    // check voucher is exist
    if (!voucher) {
      this.logger.error(`Voucher with ID ${voucherId} not found`);
      throw new NotFoundException(`Voucher with ID ${voucherId} not found`);
    }

    // check voucher is active
    const isActive = isVoucherActive(voucher);
    if (!isActive) {
      this.logger.error(`Voucher with ID ${voucherId} is not active`);
      throw new BadRequestException(
        `Voucher with ID ${voucherId} is not active`,
      );
    }

    // check subTotal is valid
    const isSubTotalValid = voucher.min_price <= grandTotal;
    if (!isSubTotalValid) {
      this.logger.error(`Voucher with ID ${voucherId} is not valid`);
      throw new BadRequestException(
        `Voucher with ID ${voucherId} is not valid`,
      );
    }

    // Jika dipanggil di process calculate, maka tidak perlu ngitung max quota
    if (!isCalculate) {
      if (voucher.quota === 0) {
        this.logger.error(`Voucher with ID ${voucherId} is max usage`);
        throw new BadRequestException(
          `Voucher with ID ${voucherId} is max usage`,
        );
      }
    }

    // Voucher amount
    voucherAmount = voucher.is_percent
      ? percentageToAmount(voucher.amount, grandTotal)
      : voucher.amount;
    // choose the lowest between voucher amount and max discount price
    if (voucher.max_price) {
      voucherAmount =
        voucherAmount > voucher.max_price ? voucher.max_price : voucherAmount;
    }

    const afterVoucher = grandTotal - voucherAmount;

    return {
      voucherAmount,
      grandTotal: afterVoucher,
    };
  }

  /**
   * Check if voucher exists
   *
   * @param voucherId - Voucher ID
   * @param storeId - Store ID
   * @returns {boolean}
   */
  private async isVoucherExist(voucherId: string, storeId: string) {
    const voucher = await this._prisma.voucher.findUnique({
      where: { id: voucherId, store_id: storeId },
    });

    return !!voucher;
  }

  /**
   * Check if voucher has been applied to an invoice
   *
   * @param voucherId - Voucher ID
   * @returns {boolean}
   */
  private async isVoucherApplied(voucherId: string) {
    const isVoucherApplied = await this._prisma.invoice.findFirst({
      where: { voucher_id: voucherId },
    });

    return !!isVoucherApplied;
  }

  async decreaseQuota(tx: Prisma.TransactionClient, voucherId: string) {
    await tx.voucher.update({
      where: { id: voucherId },
      data: { quota: { decrement: 1 } },
    });
  }
}
