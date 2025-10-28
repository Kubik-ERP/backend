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
import { ImportProductsPreviewResponseDto } from './dto/import-preview.dto';
import { ExecuteImportProductsResponseDto } from './dto/execute-import.dto';
import { DeleteBatchProductsResponseDto } from './dto/delete-batch.dto';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

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
              stock_quantity: createProductDto.stock_quantity ?? 0,
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
    // Ensure page and limit are valid numbers
    const validPage = Math.max(1, Number(page) || 1);
    const validLimit = Math.max(1, Math.min(100, Number(limit) || 10)); // Cap limit at 100
    const skip = (validPage - 1) * validLimit;
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
        take: validLimit,
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
          menu_recipes: {
            select: {
              recipe_id: true,
              recipe_name: true,
            },
          },
          master_inventory_items: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.products.count({
        where: whereCondition,
      }),
    ]);

    const productsWithDiscount = products.map((product) => {
      const basePrice = product.price ?? 0;
      const discountValue = product.discount_price ?? 0;
      const priceAfterDiscount = Math.max(basePrice - discountValue, 0);

      return {
        ...product,
        price_after_discount: priceAfterDiscount,
      };
    });

    return {
      products: productsWithDiscount,
      total,
      page: validPage,
      lastPage: Math.ceil(total / validLimit),
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
            menu_recipes: {
              select: {
                recipe_id: true,
                recipe_name: true,
              },
            },
            master_inventory_items: {
              select: {
                id: true,
                name: true,
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
            menu_recipes: {
              select: {
                recipe_id: true,
                recipe_name: true,
              },
            },
            master_inventory_items: {
              select: {
                id: true,
                name: true,
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
        menu_recipes: {
          select: {
            recipe_id: true,
            recipe_name: true,
          },
        },
        master_inventory_items: {
          select: {
            id: true,
            name: true,
          },
        },
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

        console.log('updateProductDto.image:', updateProductDto.image);

        return await tx.products.update({
          where: { id },
          data: {
            name: updateProductDto.name,
            price: updateProductDto.price ?? 0,
            discount_price: discountValue ?? 0,
            ...(updateProductDto.image === 'undefined'
              ? {}
              : { picture_url: updateProductDto.image }),
            is_percent: updateProductDto.is_percent ?? false,
            ...(updateProductDto.stock_quantity !== undefined && {
              stock_quantity: updateProductDto.stock_quantity,
            }),
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

  /**
   * Generate import template for products
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<Buffer> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Fetch categories from the store
    const categories = await this.prisma.categories.findMany({
      where: {
        stores_id: store_id,
      },
      select: { id: true, category: true },
    });

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Products
    const sheet = workbook.addWorksheet('Products');
    const columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Discount Price', key: 'discount_price', width: 15 },
      { header: 'Is Percent (t/f)', key: 'is_percent', width: 15 },
      { header: 'Category', key: 'category', width: 40 },
    ];
    sheet.columns = columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'center',
    };
    headerRow.height = 40;

    // Apply background color to all columns
    for (let col = 1; col <= 5; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add title row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT PRODUCTS']);
    sheet.mergeCells('A1:E1');
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'Required fields: Product Name(*), Price(*), Category(*). If Discount Price is filled, Is Percent is required.',
    ]);
    sheet.mergeCells('A2:E2');
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header
    const requiredCols = [1, 2, 5]; // Product Name, Price, Category
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Add sample row at row 4
    const sampleRow = sheet.getRow(4);
    sampleRow.getCell(1).value = 'Sample Product';
    sampleRow.getCell(2).value = 10000;
    sampleRow.getCell(3).value = 9000;
    sampleRow.getCell(4).value = 't';
    sampleRow.getCell(5).value =
      categories.length > 0
        ? `${categories[0].id} | ${categories[0].category}`
        : 'category-id | category-name';

    // Style sample row
    sampleRow.font = { italic: true, color: { argb: 'FF666666' } };

    // Sheet 2: Category Reference
    const catSheet = workbook.addWorksheet('Category Reference');
    catSheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Category Name', key: 'name', width: 30 },
    ];
    categories.forEach((c) =>
      catSheet.addRow({
        id: c.id,
        name: c.category,
      }),
    );

    // Create hidden dropdown for categories
    const categoryDropdownSheet = workbook.addWorksheet('Category_Dropdown', {
      state: 'hidden',
    });
    categoryDropdownSheet.columns = [
      { header: 'Category List', key: 'category_list', width: 50 },
    ];
    categories.forEach((c) =>
      categoryDropdownSheet.addRow({
        category_list: `${c.id} | ${c.category}`,
      }),
    );

    // Create hidden dropdown for Is Percent (t/f)
    const isPercentDropdownSheet = workbook.addWorksheet('IsPercent_Dropdown', {
      state: 'hidden',
    });
    isPercentDropdownSheet.columns = [
      { header: 'Is Percent Options', key: 'is_percent_options', width: 10 },
    ];
    isPercentDropdownSheet.addRow({ is_percent_options: 't' });
    isPercentDropdownSheet.addRow({ is_percent_options: 'f' });

    // Add data validation for Category column (column E, starting from row 4)
    if (categories.length > 0) {
      const categoryColumn = sheet.getColumn(5);
      for (let row = 4; row <= 1004; row++) {
        // Support up to 1000 data rows
        const cell = sheet.getCell(`E${row}`);
        cell.dataValidation = {
          type: 'list',
          allowBlank: false, // Make it required to choose from dropdown
          formulae: [`'Category_Dropdown'!$A$2:$A$${categories.length + 1}`],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid Category',
          error:
            'Please select a valid category from the dropdown list. Check the Category Reference sheet for available options.',
          showInputMessage: true,
          promptTitle: 'Category Selection',
          prompt:
            'Select a category from the dropdown. Format: "ID | Category Name"',
        };
      }
    }

    // Add data validation for Is Percent column (column D, starting from row 4)
    const isPercentColumn = sheet.getColumn(4);
    for (let row = 4; row <= 1004; row++) {
      // Support up to 1000 data rows
      const cell = sheet.getCell(`D${row}`);
      cell.dataValidation = {
        type: 'list',
        allowBlank: false, // Make it required to choose from dropdown
        formulae: [`'IsPercent_Dropdown'!$A$2:$A$3`], // Only t and f options
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error:
          'Please select either "t" (true) or "f" (false) from the dropdown list.',
        showInputMessage: true,
        promptTitle: 'Is Percent',
        prompt:
          'Select "t" for percentage discount or "f" for fixed amount discount.',
      };
    }

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      if (column.width && column.width < 15) {
        column.width = 15;
      }
    });

    // Return as buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  /**
   * Preview import data from Excel file
   */
  public async previewImport(
    file: Express.Multer.File,
    header: ICustomRequestHeaders,
    existingBatchId?: string,
  ): Promise<ImportProductsPreviewResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    if (!file) throw new BadRequestException('File is required');

    // Validate file format
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files are allowed');
    }

    // Use existing batch ID or generate new one
    const batchId = existingBatchId || uuidv4();

    // If using existing batch ID, delete previous data
    if (existingBatchId) {
      try {
        await this.prisma.temp_import_products.deleteMany({
          where: { batch_id: existingBatchId },
        });
      } catch (error) {
        throw new BadRequestException('Failed to clear previous import data');
      }
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new BadRequestException('No worksheet found in the Excel file');
      }

      const validData: any[] = [];
      const invalidData: any[] = [];

      // Start from row 4 (skip title, instructions, and header)
      const startRow = 4;
      let endRow = worksheet.rowCount;

      // Find actual end row by checking for empty rows
      for (let i = endRow; i >= startRow; i -= 1) {
        const row = worksheet.getRow(i);
        const hasData =
          row.values &&
          Array.isArray(row.values) &&
          row.values.some(
            (value) =>
              value !== null &&
              value !== undefined &&
              String(value).trim() !== '',
          );
        if (hasData) {
          endRow = i;
          break;
        }
      }

      for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);

        const productName = this.getCellValue(row.getCell(1));
        const price = this.getCellValue(row.getCell(2));
        const discountPrice = this.getCellValue(row.getCell(3));
        const isPercent = this.getCellValue(row.getCell(4));
        const category = this.getCellValue(row.getCell(5));

        let isValid = true;
        const rowErrors: string[] = [];

        // Validate required fields
        if (!productName) {
          isValid = false;
          rowErrors.push('Product name is required');
        } else if (productName.length > 45) {
          isValid = false;
          rowErrors.push('Product name exceeds maximum length (45 characters)');
        }

        // Validate price
        if (price === null || price === undefined || isNaN(Number(price))) {
          isValid = false;
          rowErrors.push('Price is required and must be a valid number');
        }

        // Validate category (now in format "id | name")
        let categoryId = null;
        if (category) {
          const categoryParts = category.split(' | ');
          if (categoryParts.length === 2) {
            categoryId = categoryParts[0].trim();
          } else {
            isValid = false;
            rowErrors.push('Category must be in format: id | name');
          }
        } else {
          isValid = false;
          rowErrors.push('Category is required');
        }

        // Validate discount_price and is_percent logic
        const hasDiscountPrice =
          discountPrice !== null &&
          discountPrice !== undefined &&
          discountPrice.toString().trim() !== '';
        const hasIsPercent =
          isPercent !== null &&
          isPercent !== undefined &&
          isPercent.toString().trim() !== '';

        let finalIsPercent = false;
        let finalDiscountPrice = null;

        if (hasDiscountPrice) {
          // If discount_price is filled, is_percent is required
          if (hasIsPercent) {
            // Validate is_percent value
            const isPercentValue = isPercent.toString().toLowerCase();
            if (['t', 'true'].includes(isPercentValue)) {
              finalIsPercent = true;
            } else if (['f', 'false'].includes(isPercentValue)) {
              finalIsPercent = false;
            } else {
              isValid = false;
              rowErrors.push('Is Percent must be t/f or true/false');
            }
          } else {
            isValid = false;
            rowErrors.push(
              'If Discount Price is filled, Is Percent is required',
            );
          }

          // Validate discount_price is a number
          if (isNaN(Number(discountPrice))) {
            isValid = false;
            rowErrors.push('Discount Price must be a valid number');
          } else {
            finalDiscountPrice = Number(discountPrice);
          }
        } else {
          // If discount_price is not filled, set is_percent to false by default
          finalIsPercent = false;
        }

        // Check for duplicate product name in store
        if (productName) {
          try {
            const existingProduct = await this.prisma.products.findFirst({
              where: {
                name: productName,
                stores_id: store_id,
              },
            });

            if (existingProduct) {
              isValid = false;
              rowErrors.push(
                `Product name '${productName}' already exists in this store`,
              );
            }
          } catch (error) {
            isValid = false;
            rowErrors.push('Error validating product name');
          }
        }

        // Check if category exists and get category details
        let categoryDetails = null;
        if (categoryId) {
          try {
            const existingCategory = await this.prisma.categories.findUnique({
              where: {
                id: categoryId,
              },
              select: {
                id: true,
                category: true,
              },
            });

            if (existingCategory) {
              categoryDetails = {
                id: existingCategory.id,
                name: existingCategory.category,
              };
            } else {
              isValid = false;
              rowErrors.push(`Category ID '${categoryId}' does not exist`);
            }
          } catch (error) {
            isValid = false;
            rowErrors.push('Error validating category ID');
          }
        }

        const status = isValid ? 'valid' : 'invalid';
        const errorMessages =
          rowErrors.length > 0 ? rowErrors.join('; ') : null;

        const rowData = {
          batch_id: batchId,
          row_number: rowNumber,
          name: productName || '',
          price: price ? Number(price) : null,
          discount_price: finalDiscountPrice,
          picture_url: null, // Always null as per requirement
          is_percent: finalIsPercent,
          stores_id: store_id,
          category_id: categoryId || null,
          status,
          error_messages: errorMessages,
        };

        if (isValid) {
          validData.push({
            id: batchId, // Using batch_id as temporary id like brands
            row_number: rowNumber,
            name: productName,
            price: Number(price),
            discount_price: finalDiscountPrice,
            is_percent: finalIsPercent,
            category_id: categoryId,
            category: categoryDetails, // Add category details
          });

          // Save to temp table
          await this.prisma.temp_import_products.create({
            data: rowData,
          });
        } else {
          invalidData.push({
            id: batchId, // Using batch_id as temporary id like brands
            row_number: rowNumber,
            name: productName || '',
            price: price ? Number(price) : null,
            discount_price: finalDiscountPrice,
            is_percent: finalIsPercent,
            category_id: categoryId || null,
            category: categoryDetails, // Add category details (could be null if invalid)
            error_messages: errorMessages,
          });

          // Save to temp table with errors
          await this.prisma.temp_import_products.create({
            data: rowData,
          });
        }
      }

      return {
        batch_id: batchId,
        total_rows: validData.length + invalidData.length,
        valid_rows: validData.length,
        invalid_rows: invalidData.length,
        success_data: validData,
        failed_data: invalidData,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process import file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Execute import from temp table
   */
  public async executeImport(
    batchId: string,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportProductsResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    try {
      // Get all valid records from temp table
      const tempRecords = await this.prisma.temp_import_products.findMany({
        where: {
          batch_id: batchId,
          status: 'valid',
        },
      });

      if (tempRecords.length === 0) {
        return {
          success: false,
          message: 'No valid records found for import',
        };
      }

      const errors: Array<{
        row_number: number;
        name: string;
        error_messages: string;
      }> = [];

      let successCount = 0;

      // Process each record
      for (const tempRecord of tempRecords) {
        try {
          // Create product using existing create method (skip variants as requested)
          const createProductDto: CreateProductDto = {
            name: tempRecord.name || '',
            price: tempRecord.price || 0,
            discount_price: tempRecord.discount_price || 0,
            image: undefined, // Set to undefined instead of null
            is_percent: tempRecord.is_percent || false,
            isDiscount:
              tempRecord.discount_price !== null &&
              tempRecord.discount_price !== undefined, // Set isDiscount based on discount_price presence
            categories: tempRecord.category_id
              ? [{ id: tempRecord.category_id }]
              : [],
            // Skip variants as per requirement
          };

          await this.create(createProductDto, {
            ...header,
            store_id: tempRecord.stores_id || store_id,
          } as ICustomRequestHeaders);

          successCount += 1;
        } catch (error) {
          errors.push({
            row_number: tempRecord.row_number,
            name: tempRecord.name || '',
            error_messages: error.message || 'Unknown error occurred',
          });
        }
      }

      const success = errors.length === 0;
      const message = success
        ? `Successfully imported ${successCount} products`
        : `Imported ${successCount} products with ${errors.length} errors`;

      // Clean up temp records after import (like brands module)
      await this.prisma.temp_import_products.deleteMany({
        where: { batch_id: batchId },
      });

      return {
        success,
        message,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to execute import',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete import batch from temp table
   */
  public async deleteBatch(
    batchId: string,
  ): Promise<DeleteBatchProductsResponseDto> {
    try {
      const result = await this.prisma.temp_import_products.deleteMany({
        where: {
          batch_id: batchId,
        },
      });

      return {
        success: true,
        message: `Successfully deleted ${result.count} records`,
        deletedCount: result.count,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete batch',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper method to get cell value
   */
  private getCellValue(cell: any): string | null {
    if (!cell || cell.value === null || cell.value === undefined) {
      return null;
    }

    // Handle different cell value types
    if (typeof cell.value === 'object' && cell.value.text) {
      return String(cell.value.text).trim();
    }

    return String(cell.value).trim();
  }
}
