import { Injectable } from '@nestjs/common';
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
    const { name, description, productId } = createProductBundlingDto;
    const bundling = await this.prisma.catalog_bundling.create({
      data: {
        name,
        description,
        store_id: store_id,
      },
    });
    const bundlingProducts = productId.map((product) => ({
      catalog_bundling_id: bundling.id,
      product_id: product,
    }));
    await this.prisma.catalog_bundling_has_product.createMany({
      data: bundlingProducts,
    });
    return {
      bundling,
      products: bundlingProducts,
    };
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
        where: { store_id: store_id },
        skip: skip,
        take: limit,
        include: {
          catalog_bundling_has_product: {
            include: {
              products: true,
            },
          },
        },
      }),
    ]);
    const mappedBundling = productBundling.map((item) => ({
      ...item,
      products: item.catalog_bundling_has_product.map(
        (product) => product.products,
      ),
      catalog_bundling_has_product: undefined,
    }));
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: mappedBundling,
      meta: {
        page,
        pageSize: limit,
        total: totalItems,
        totalPages,
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} productBundling`;
  }

  async update(id: string, updateProductBundlingDto: UpdateProductBundlingDto) {
    const { name, description, productId } = updateProductBundlingDto;
    const existing = await this.prisma.catalog_bundling.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Product bundling not found');
    }
    const bundling = await this.prisma.catalog_bundling.update({
      where: { id },
      data: {
        name,
        description,
      },
    });
    let bundlingProducts: any[] = [];
    if (productId && productId.length !== 0) {
      bundlingProducts = productId.map((product) => ({
        catalog_bundling_id: bundling.id,
        product_id: product,
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
