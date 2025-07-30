import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { products as ProductModel } from '@prisma/client';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductDto: CreateProductDto,
    header: ICustomRequestHeaders,
  ): Promise<ProductModel> {
    let discountValue: number | undefined = 0;
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const existingProduct = await this.prisma.products.findFirst({
        where: { name: createProductDto.name },
      });
      if (existingProduct) {
        throw new Error('Product with this name already exists');
      }
      if (createProductDto.discount_price === 0) {
        discountValue = createProductDto.price;
      } else {
        discountValue = createProductDto.discount_price;
      }

      const createdProduct = await this.prisma.products.create({
        data: {
          name: createProductDto.name,
          price: createProductDto.price,
          discount_price: discountValue,
          picture_url: createProductDto.image,
          is_percent: createProductDto.is_percent,
        },
      });

      await this.prisma.stores_has_products.create({
        data: {
          stores_id: store_id,
          products_id: createdProduct.id,
        },
      });

      if (createProductDto.categories?.length) {
        for (const category of createProductDto.categories) {
          await this.prisma.categories_has_products.create({
            data: {
              products_id: createdProduct.id,
              categories_id: category.id,
            },
          });
        }
      }

      if (createProductDto.variants?.length) {
        for (const variant of createProductDto.variants) {
          const createdVariant = await this.prisma.variant.create({
            data: {
              name: variant.name,
              price: variant.price,
            },
          });

          await this.prisma.variant_has_products.create({
            data: {
              products_id: createdProduct.id,
              variant_id: createdVariant.id,
            },
          });
        }
      }

      const productWithCategories = await this.prisma.products.findUnique({
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

    const whereCondition = {
      store_id,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };
    const query = this.prisma.products.findMany({
      where: whereCondition
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

    const count = this.prisma.products.count({
      where: search
        ? {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {},
    });

    const [products, total] = await Promise.all([query, count]);

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

      // Cek duplikasi nama
      if (updateProductDto.name) {
        const duplicateProduct = await this.prisma.products.findFirst({
          where: {
            name: updateProductDto.name,
            NOT: { id },
          },
        });
        if (duplicateProduct) {
          throw new BadRequestException('Product name must be unique');
        }
      }

      const updatedProduct = await this.prisma.products.update({
        where: { id },
        data: {
          name: updateProductDto.name,
          price: updateProductDto.price,
          discount_price: updateProductDto.discount_price,
          picture_url: updateProductDto.image,
          is_percent: updateProductDto.is_percent,
        },
        include: {
          categories_has_products: true,
        },
      });

      if (updateProductDto.categories?.length) {
        await this.prisma.categories_has_products.deleteMany({
          where: { products_id: id },
        });

        await this.prisma.categories_has_products.createMany({
          data: updateProductDto.categories.map((cat) => ({
            products_id: id,
            categories_id: cat.id,
          })),
        });
      }

      // Update variants: hapus semua -> buat ulang
      if (updateProductDto.variants?.length) {
        await this.prisma.variant_has_products.deleteMany({
          where: { products_id: id },
        });

        for (const variant of updateProductDto.variants) {
          const createdVariant = await this.prisma.variant.create({
            data: {
              name: variant.name,
              price: variant.price ?? 0,
            },
          });

          await this.prisma.variant_has_products.create({
            data: {
              products_id: id,
              variant_id: createdVariant.id,
            },
          });
        }
      }

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

      await this.prisma.categories_has_products.deleteMany({
        where: {
          products_id: id,
        },
      });

      await this.prisma.variant_has_products.deleteMany({
        where: {
          products_id: id,
        },
      });

      await this.prisma.products.delete({
        where: { id },
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
}
