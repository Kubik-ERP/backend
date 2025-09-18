import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { products as ProductModel, products } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { validate as isUUID } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateDiscountPriceDto } from './dto/update-discount-price.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
    header: ICustomRequestHeaders,
  ): Promise<ProductModel> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const existingProduct = await this.prisma.products.findFirst({
        where: { name: createProductDto.name, stores_id: store_id },
      });
      if (existingProduct) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Product name must be unique',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // jika discount_price tidak ada, maka discountValue = price
      const discountValue = createProductDto?.isDiscount
        ? createProductDto.discount_price
        : createProductDto.price;

      const productWithCategories = await this.prisma.$transaction(
        async (tx) => {
          // Use unchecked create to bypass strict type checking
          const createdProduct = await tx.products.create({
            data: {
              name: createProductDto.name,
              price: createProductDto.price ?? 0,
              discount_price: discountValue ?? 0,
              picture_url: createProductDto.image ?? null,
              is_percent: createProductDto.is_percent ?? false,
              stores_id: store_id,
            } as products,
          });

          if (createProductDto.categories?.length) {
            for (const category of createProductDto.categories) {
              await tx.categories_has_products.create({
                data: {
                  products_id: createdProduct.id,
                  categories_id: category.id,
                },
              });
            }
          }

          if (createProductDto.variants?.length) {
            for (const variant of createProductDto.variants) {
              const createdVariant = await tx.variant.create({
                data: {
                  name: variant.name,
                  price: variant.price,
                },
              });

              await tx.variant_has_products.create({
                data: {
                  products_id: createdProduct.id,
                  variant_id: createdVariant.id,
                },
              });
            }
          }

          // Apply product ke voucher yang diterapkan untuk semua product
          // memiliki is_apply_all_products = true
          const vouchers = await tx.voucher.findMany({
            where: {
              is_apply_all_products: true,
              store_id: store_id,
            },
          });
          await tx.voucher_has_products.createMany({
            data: vouchers.map((voucher) => ({
              voucher_id: voucher.id,
              products_id: createdProduct.id,
            })),
          });

          return await tx.products.findUnique({
            where: { id: createdProduct.id },
            include: {
              categories_has_products: true,
              variant_has_products: {
                include: {
                  variant: true,
                },
              },
            },
          });
        },
      );

      return productWithCategories!;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    {
      page = 1,
      limit = 10,
      search = '',
      category_id = [],
    }: {
      page?: number;
      limit?: number;
      search?: string;
      category_id?: string[];
    },
    header: ICustomRequestHeaders,
  ) {
    const skip = (page - 1) * limit;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const whereCondition: any = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
      ...(category_id.length > 0 && {
        categories_has_products: {
          some: {
            categories_id: {
              in: category_id,
            },
          },
        },
      }),
      stores_id: store_id,
    };

    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          categories_has_products: {
            include: {
              categories: true,
            },
          },
          variant_has_products: {
            include: {
              variant: true,
            },
          },
        },
      }),
      this.prisma.products.count({
        where: whereCondition,
      }),
    ]);

    return {
      products,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(
    idOrNames: string | string[],
  ): Promise<ProductModel | ProductModel[] | null> {
    if (typeof idOrNames === 'string') {
      if (isUUID(idOrNames)) {
        return this.prisma.products.findUnique({
          where: { id: idOrNames },
          include: {
            categories_has_products: {
              include: {
                categories: true,
              },
            },
            variant_has_products: {
              include: {
                variant: true,
              },
            },
          },
        });
      } else {
        return this.prisma.products.findMany({
          where: { name: { contains: idOrNames, mode: 'insensitive' } },
          include: {
            categories_has_products: {
              include: {
                categories: true,
              },
            },
            variant_has_products: {
              include: {
                variant: true,
              },
            },
          },
        });
      }
    }

    return this.prisma.products.findMany({
      where: {
        name: { in: idOrNames, mode: 'insensitive' },
      },
    });
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductModel> {
    try {
      const existingProduct = await this.prisma.products.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      if (updateProductDto.name) {
        const duplicateProduct = await this.prisma.products.findFirst({
          where: {
            name: updateProductDto.name,
            stores_id: existingProduct.stores_id,
            NOT: { id },
          },
        });
        if (duplicateProduct) {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Product name must be unique',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const updatedProduct = await this.prisma.$transaction(async (tx) => {
        if (updateProductDto.categories?.length) {
          await tx.categories_has_products.deleteMany({
            where: { products_id: id },
          });

          await tx.categories_has_products.createMany({
            data: updateProductDto.categories.map((cat) => ({
              products_id: id,
              categories_id: cat.id,
            })),
          });
        }

        // Update variants: hapus semua -> buat ulang
        if (updateProductDto.variants?.length) {
          await tx.variant_has_products.deleteMany({
            where: { products_id: id },
          });

          for (const variant of updateProductDto.variants) {
            const createdVariant = await tx.variant.create({
              data: {
                name: variant.name,
                price: variant.price ?? 0,
              },
            });

            await tx.variant_has_products.create({
              data: {
                products_id: id,
                variant_id: createdVariant.id,
              },
            });
          }
        }

        // jika discount_price tidak ada, maka discountValue = price
        const discountValue = updateProductDto?.isDiscount
          ? updateProductDto.discount_price
          : updateProductDto.price;

        return await tx.products.update({
          where: { id },
          data: {
            name: updateProductDto.name,
            price: updateProductDto.price ?? 0,
            discount_price: discountValue ?? 0,
            picture_url: updateProductDto.image ?? null,
            is_percent: updateProductDto.is_percent ?? false,
          },
          include: {
            categories_has_products: true,
          },
        });
      });

      return updatedProduct;
    } catch (error) {
      console.error('Update product error:', error);
      throw new HttpException(
        error.message || 'Failed to update product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const existingProduct = await this.prisma.products.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.voucher_has_products.deleteMany({
          where: {
            products_id: id,
          },
        });

        await tx.categories_has_products.deleteMany({
          where: {
            products_id: id,
          },
        });

        await tx.variant_has_products.deleteMany({
          where: {
            products_id: id,
          },
        });

        await tx.products.delete({
          where: { id },
        });
      });

      return true;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Failed to delete product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProduct(productId: string) {
    const result = await this.prisma.products.findFirst({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        discount_price: true,
      },
    });
    if (!result) {
      throw new BadRequestException(`Variant with id ${productId} not found`);
    }

    const safeResult = {
      ...result,
      price: result.price ?? 0,
      discount_price: result.discount_price ?? 0,
    };

    return safeResult;
  }

  async bulkUpdateDiscountPrice(
    updateDiscountPriceDto: UpdateDiscountPriceDto,
  ) {
    const { productIds, value, isPercent } = updateDiscountPriceDto;
    try {
      if (!value || value < 0) {
        throw new BadRequestException('Discount must be a positive number');
      }
      const productsToUpdate = await this.prisma.products.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
      });
      if (productsToUpdate.length !== productIds.length) {
        const foundIds = new Set(productsToUpdate.map((p) => p.id));
        const notFoundIds = productIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Products with the following IDs were not found: ${notFoundIds.join(', ')}`,
        );
      }
      const updatePromises = productsToUpdate.map((product) => {
        let newDiscountPrice = 0;

        if (isPercent) {
          const discountAmount = (product.price || 0) * (value / 100);
          newDiscountPrice = (product.price || 0) - discountAmount;
        } else {
          newDiscountPrice = (product.price || 0) - value;
        }

        const finalPrice = Math.max(0, newDiscountPrice);

        return this.prisma.products.update({
          where: { id: product.id },
          data: {
            discount_price: finalPrice,
          },
        });
      });

      await this.prisma.$transaction(updatePromises);

      return true;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        error.message || 'Failed to update discount price',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
