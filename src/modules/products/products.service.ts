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

  async create(createProductDto: CreateProductDto): Promise<ProductModel> {
    try {
      const existingProduct = await this.prisma.products.findFirst({
        where: { name: createProductDto.name },
      });

      if (existingProduct) {
        throw new BadRequestException('Product name must be unique');
      }
      const createdProduct = await this.prisma.products.create({
        data: {
          name: createProductDto.name,
          price: createProductDto.price,
          discount_price: createProductDto.discount_price,
          picture_url: createProductDto.picture_url,
          categories_has_products: {
            create: createProductDto.categories.map((cat) => ({
              categories_id: cat.id,
            })),
          },
        },
        include: {
          categories_has_products: true,
        },
      });
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
      return createdProduct;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ProductModel[]> {
    return await this.prisma.products.findMany({
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

  async findOne(
    idOrNames: string | string[],
  ): Promise<ProductModel | ProductModel[] | null> {
    if (typeof idOrNames === 'string') {
      if (isUUID(idOrNames)) {
        return await this.prisma.products.findUnique({
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
        return await this.prisma.products.findMany({
          where: { name: { contains: idOrNames, mode: 'insensitive' } },
        });
      }
    }

    return await this.prisma.products.findMany({
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
          where: { name: updateProductDto.name, NOT: { id } },
        });

        if (duplicateProduct) {
          throw new BadRequestException('Product name must be unique');
        }
      }

      return await this.prisma.products.update({
        where: { id },
        data: { ...updateProductDto },
      });
    } catch (error) {
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

      await this.prisma.products.delete({ where: { id } });
      return true;
    } catch (error) {
      throw new HttpException(
        'Failed to delete product',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
