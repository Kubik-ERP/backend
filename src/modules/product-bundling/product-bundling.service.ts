import { Injectable } from '@nestjs/common';
import { catalog_bundling_has_product } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductBundlingDto } from './dto/create-product-bundling.dto';
import { QueryProductBundling } from './dto/query-product-bundling.dto';
import { UpdateProductBundlingDto } from './dto/update-product-bundling.dto';

@Injectable()
export class ProductBundlingService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createProductBundlingDto: CreateProductBundlingDto,
    req: ICustomRequestHeaders,
  ) {
    const { store_id } = req;
    if (!store_id) {
      throw new Error('Store ID is required');
    }
    const { name, description, products, type, discount, price, image } =
      createProductBundlingDto;
    const bundling = await this.prisma.catalog_bundling.create({
      data: {
        name,
        description,
        type,
        discount: type === 'DISCOUNT' ? discount : null,
        price: type === 'CUSTOM' ? price : null,
        store_id: store_id,
        picture_url: image ?? null,
      },
    });
    const bundlingProducts = products.map((product) => ({
      catalog_bundling_id: bundling.id,
      product_id: product.productId,
      quantity: product.quantity,
    }));
    await this.prisma.catalog_bundling_has_product.createMany({
      data: bundlingProducts,
    });
    return {
      bundling,
      products: bundlingProducts,
    };
  }

  async _countTotalPrice(products: catalog_bundling_has_product[]) {
    if (!products || products.length === 0) {
      return 0;
    }
    let total = 0;
    await Promise.all(
      products.map(async (product) => {
        const productPrice = await this.prisma.products.findUnique({
          where: { id: product.product_id },
        });
        total += (productPrice?.price ?? 0) * (product.quantity ?? 1);
      }),
    );
    return total;
  }

  async findAll(query: QueryProductBundling, req: ICustomRequestHeaders) {
    const { store_id } = req;
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const [totalItems, productBundling] = await this.prisma.$transaction([
      this.prisma.catalog_bundling.count({
        where: { store_id: store_id },
      }),
      this.prisma.catalog_bundling.findMany({
        where: {
          store_id: store_id,
          ...(query.search && {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          }),
        },
        skip: skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          catalog_bundling_has_product: {
            include: {
              products: true,
            },
          },
        },
      }),
    ]);
    const mappedBundling = productBundling.map(async (item) => {
      let price = 0;
      price = await this._countTotalPrice(item.catalog_bundling_has_product);
      if (item.type === 'DISCOUNT') {
        price -= price * ((item.discount?.toNumber() ?? 0) / 100);
      }
      return {
        ...item,
        discount: item.discount ? item.discount.toNumber() : undefined,
        products: item.catalog_bundling_has_product.map((product) => ({
          product_id: product.products.id,
          product_name: product.products.name,
          product_price: product.products.price,
          product_discount_price: product.products.discount_price,
          quantity: product.quantity,
        })),
        catalog_bundling_has_product: undefined,
        price: item.type === 'CUSTOM' ? item.price : price,
      };
    });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: await Promise.all(mappedBundling),
      meta: {
        page,
        pageSize: limit,
        total: totalItems,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const existing = await this.prisma.catalog_bundling.findUnique({
      where: { id },
      include: {
        catalog_bundling_has_product: {
          include: {
            products: {
              include: {
                categories_has_products: {
                  include: {
                    categories: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!existing) {
      throw new Error('Product bundling not found');
    }
    let price = 0;
    price = await this._countTotalPrice(existing.catalog_bundling_has_product);
    if (existing.type === 'DISCOUNT') {
      price -= price * ((existing.discount?.toNumber() ?? 0) / 100);
    }
    return {
      ...existing,
      discount: existing.discount ? existing.discount.toNumber() : undefined,
      products: existing.catalog_bundling_has_product.map((product) => ({
        product_id: product.products.id,
        product_name: product.products.name,
        product_price: product.products.price,
        product_discount_price: product.products.discount_price,
        product_categories: product.products.categories_has_products.map(
          (category) => ({
            category_id: category.categories.id,
            category_name: category.categories.category,
          }),
        ),
        quantity: product.quantity,
      })),
      catalog_bundling_has_product: undefined,
      price: existing.type === 'CUSTOM' ? existing.price : price,
    };
  }

  async update(id: string, updateProductBundlingDto: UpdateProductBundlingDto) {
    const { name, description, products } = updateProductBundlingDto;
    const existing = await this.prisma.catalog_bundling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Product bundling not found');
    }
    const type = updateProductBundlingDto.type ?? existing.type;
    const discount = updateProductBundlingDto.discount ?? existing.discount;
    const price = updateProductBundlingDto.price ?? existing.price;
    const image = updateProductBundlingDto.image;
    console.log(
      'update(id: string, updateProductBundlingDto: UpdateProductBundlingDto) image:',
      image,
    );
    const bundling = await this.prisma.catalog_bundling.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        type: type ?? existing.type,
        discount: type === 'DISCOUNT' ? discount : null,
        price: type === 'CUSTOM' ? price : null,
        picture_url: image,
      },
    });
    let bundlingProducts: any[] = [];
    if (products && products.length !== 0) {
      bundlingProducts = products.map((product) => ({
        catalog_bundling_id: bundling.id,
        product_id: product.productId,
        quantity: product.quantity,
      }));
      await this.prisma.catalog_bundling_has_product.deleteMany({
        where: { catalog_bundling_id: bundling.id },
      });
      await this.prisma.catalog_bundling_has_product.createMany({
        data: bundlingProducts,
      });
    }
    return {
      bundling,
      products: bundlingProducts,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.catalog_bundling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Product bundling not found');
    }
    return await this.prisma.catalog_bundling.delete({
      where: { id },
    });
  }
}
