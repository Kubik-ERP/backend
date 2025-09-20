import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { categories as CategoryModel, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/prisma/prisma.service';
import { validate as isUUID, v4 as uuidv4 } from 'uuid';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ExecuteImportCategoriesResponseDto } from './dto/execute-import.dto';
import { ImportCategoriesPreviewResponseDto } from './dto/import-preview.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createCategoryDto: CreateCategoryDto & { image: string },
    header: ICustomRequestHeaders,
  ) {
    const { category, description, image } = createCategoryDto;
    const store_id = header.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }
    const existingCategory = await this.prisma.categories.findFirst({
      where: {
        category: category,
        stores_id: store_id,
      },
    });

    if (existingCategory) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Category must be unique',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newCategory = await this.prisma.categories.create({
      data: {
        category,
        description,
        picture_url: image,
        stores_id: store_id,
      },
    });

    return newCategory;
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
    const [storeCategories, total] = await Promise.all([
      this.prisma.categories.findMany({
        where: {
          stores_id: store_id,
          ...(search && {
            category: {
              contains: search,
              mode: 'insensitive',
            },
          }),
        },
        skip,
        take: limit,
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.categories.count({
        where: {
          stores_id: store_id,
          ...(search && {
            category: {
              contains: search,
              mode: 'insensitive',
            },
          }),
        },
      }),
    ]);
    return {
      data: storeCategories,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  public async findOne(idOrcategory: string): Promise<CategoryModel | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.categories.findUnique({
        where: { id: idOrcategory },
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    } else {
      return await this.prisma.categories.findFirst({
        where: {
          category: { contains: idOrcategory, mode: 'insensitive' },
        },
        include: {
          categories_has_products: {
            include: {
              products: {
                include: {
                  variant_has_products: {
                    include: {
                      variant: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
  }

  public async findMany(
    idOrcategory: string,
  ): Promise<CategoryModel | CategoryModel[] | null> {
    if (isUUID(idOrcategory)) {
      return await this.prisma.categories.findUnique({
        where: { id: idOrcategory },
      });
    } else {
      return await this.prisma.categories.findMany({
        where: {
          category: { contains: idOrcategory, mode: 'insensitive' },
        },
      });
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const existingCategory = await this.prisma.categories.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      if (updateCategoryDto.category) {
        const duplicateCategory = await this.prisma.categories.findFirst({
          where: {
            category: updateCategoryDto.category,
            stores_id: existingCategory.stores_id,
            NOT: { id },
          },
        });

        if (duplicateCategory) {
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Category must be unique',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const updatedCategory = await this.prisma.categories.update({
        where: { id },
        data: {
          category: updateCategoryDto.category || existingCategory.category,
          description:
            updateCategoryDto.description || existingCategory.description,
          picture_url: updateCategoryDto.image,
        },
      });

      return updatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message || 'Failed to update category');
    }
  }

  async remove(id: string) {
    try {
      const existingCategory = await this.prisma.categories.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      await this.prisma.categories.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  async findAllCategories(search?: string, header?: ICustomRequestHeaders) {
    const store_id = header?.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const categories = await this.prisma.categories.findMany({
      where: {
        stores_id: store_id,
        ...(search && {
          category: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      include: {
        categories_has_products: {
          include: {
            products: true,
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Transform the data to match the required format
    const transformedCategories = categories.map((category) => ({
      id: category.id,
      category: category.category,
      description: category.description,
      pictureUrl: category.picture_url,
      totalItems: category.categories_has_products.length,
    }));

    return transformedCategories;
  }

  async findCatalogProducts(
    search?: string,
    categoryId?: string,
    header?: ICustomRequestHeaders,
  ) {
    const store_id = header?.store_id;

    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const baseConditions: Prisma.categoriesWhereInput[] = [];

    if (search) {
      baseConditions.push({
        categories_has_products: {
          some: {
            products: {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  barcode: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      });
    }
    baseConditions.push({ stores_id: store_id });

    if (categoryId) {
      baseConditions.push({ id: categoryId });
    }

    const whereClause: Prisma.categoriesWhereInput =
      baseConditions.length > 0 ? { AND: baseConditions } : {};

    // Get categories with their products
    const categories = await this.prisma.categories.findMany({
      where: whereClause,
      include: {
        categories_has_products: {
          include: {
            products: {
              include: {
                variant_has_products: {
                  include: {
                    variant: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    });

    // Transform the data to match the required format
    const transformedData = categories.map((category) => ({
      id: category.id,
      category: category.category,
      description: category.description,
      items: category.categories_has_products.map((categoryProduct) => ({
        id: categoryProduct.products.id,
        name: categoryProduct.products.name,
        price: categoryProduct.products.price,
        discountPrice: categoryProduct.products.discount_price,
        pictureUrl: categoryProduct.products.picture_url,
        barcode: categoryProduct.products.barcode,
        isPercent: categoryProduct.products.is_percent,
        variant: categoryProduct.products.variant_has_products.map(
          (variantProduct) => ({
            id: variantProduct.variant.id,
            productsId: variantProduct.products_id,
            name: variantProduct.variant.name,
            price: variantProduct.variant.price,
          }),
        ),
      })),
    }));

    // Filter out categories with no items if search is applied
    return transformedData.filter(
      (category) => !search || category.items.length > 0,
    );
  }

  /**
   * Generate Excel import template for categories
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<Buffer> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Categories
    const sheet = workbook.addWorksheet('Categories');
    const columns = [
      { header: 'Category Name', key: 'category', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
    ];
    sheet.columns = columns;

    // Style header row - Set alignment and wrapping for better visibility
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'center',
    };
    headerRow.height = 40; // Increased height for auto-wrapped text

    // Apply background color to all columns with data (A to B = 2 columns)
    for (let col = 1; col <= 2; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add title row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT CATEGORIES']);
    sheet.mergeCells('A1:B1'); // Merge across 2 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. Images are not imported and will be set to null.',
    ]);
    sheet.mergeCells('A2:B2'); // Merge across 2 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header (Category Name)
    const requiredCols = [1]; // Category Name
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Add sample row at row 4
    const sampleRow = sheet.getRow(4);
    sampleRow.getCell(1).value = 'Food & Beverage'; // Category Name
    sampleRow.getCell(2).value = 'Food and drink products'; // Description

    // Style sample row to indicate it's an example
    sampleRow.font = { italic: true, color: { argb: 'FF666666' } };

    // Auto-fit columns to ensure all data is visible
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
  ): Promise<ImportCategoriesPreviewResponseDto> {
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
        await this.prisma.temp_import_categories.deleteMany({
          where: { batch_id: existingBatchId },
        });
        this.logger.log(
          `Deleted previous import data for batch: ${existingBatchId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error deleting previous batch data: ${error.message}`,
        );
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

        const categoryName = this.getCellValue(row.getCell(1));
        const description = this.getCellValue(row.getCell(2));

        let isValid = true;
        const rowErrors: string[] = [];

        // Validate required fields
        if (!categoryName) {
          isValid = false;
          rowErrors.push('Category name is required');
        } else if (categoryName.length > 150) {
          isValid = false;
          rowErrors.push(
            'Category name exceeds maximum length (150 characters)',
          );
        }

        // Check for duplicate category name in store
        if (categoryName) {
          try {
            const existingCategory = await this.prisma.categories.findFirst({
              where: {
                category: categoryName,
                stores_id: store_id,
              },
            });

            if (existingCategory) {
              isValid = false;
              rowErrors.push(
                `Category '${categoryName}' already exists in this store`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error checking duplicate category: ${error.message}`,
            );
            isValid = false;
            rowErrors.push('Error validating category name');
          }
        }

        const status = isValid ? 'valid' : 'invalid';
        const errorMessages =
          rowErrors.length > 0 ? rowErrors.join('; ') : null;

        const rowData = {
          batch_id: batchId,
          row_number: rowNumber,
          category: categoryName || '',
          description: description || null,
          status,
          error_messages: errorMessages,
        };

        if (isValid) {
          validData.push({
            id: batchId, // Using batch_id as temporary id like brands
            row_number: rowNumber,
            category: categoryName,
            description: description || null,
          });

          // Save to temp table
          await this.prisma.temp_import_categories.create({
            data: {
              batch_id: batchId,
              row_number: rowNumber,
              status: 'valid',
              category: categoryName,
              description: description || null,
            },
          });
        } else {
          invalidData.push({
            id: batchId, // Using batch_id as temporary id like brands
            row_number: rowNumber,
            category: categoryName || '',
            description: description || null,
            error_messages: errorMessages,
          });

          // Save to temp table with errors
          await this.prisma.temp_import_categories.create({
            data: {
              batch_id: batchId,
              row_number: rowNumber,
              status: 'invalid',
              category: categoryName || '',
              description: description || null,
              error_messages: errorMessages,
            },
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
      this.logger.error(`Error processing Excel file: ${error.message}`);
      throw new BadRequestException(
        'Failed to process Excel file. Please check the format and try again.',
      );
    }
  }

  /**
   * Execute import of categories from temp table to master table
   */
  public async executeImport(
    batchId: string,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportCategoriesResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Get valid temp records
    const tempRecords = await this.prisma.temp_import_categories.findMany({
      where: {
        batch_id: batchId,
        status: 'valid',
      },
      orderBy: { row_number: 'asc' },
    });

    if (tempRecords.length === 0) {
      throw new BadRequestException('No valid records found for this batch');
    }

    const failedCategories: Array<{
      rowNumber: number;
      categoryName: string;
      errorMessage: string;
    }> = [];

    let successCount = 0;

    for (const tempRecord of tempRecords) {
      try {
        // Double-check for duplicates before creating
        const existingCategory = await this.prisma.categories.findFirst({
          where: {
            category: tempRecord.category,
            stores_id: store_id,
          },
        });

        if (existingCategory) {
          failedCategories.push({
            rowNumber: tempRecord.row_number,
            categoryName: tempRecord.category || '',
            errorMessage: 'Category already exists',
          });
          continue;
        }

        // Create category using existing create logic (image is null for imports)
        const createDto: CreateCategoryDto & { image: string } = {
          category: tempRecord.category || '',
          description: tempRecord.description || undefined,
          image: '', // Set to empty string as images are not imported
        };

        await this.create(createDto, header);
        successCount += 1;
      } catch (error) {
        this.logger.error(
          `Error importing category at row ${tempRecord.row_number}: ${error.message}`,
        );
        failedCategories.push({
          rowNumber: tempRecord.row_number,
          categoryName: tempRecord.category || '',
          errorMessage: error.message || 'Unknown error occurred',
        });
      }
    }

    // Clean up temp records after import
    await this.prisma.temp_import_categories.deleteMany({
      where: { batch_id: batchId },
    });

    return {
      totalProcessed: tempRecords.length,
      successCount,
      failureCount: failedCategories.length,
      failedCategories,
    };
  }

  /**
   * Delete batch data from temp table
   */
  public async deleteBatch(batchId: string): Promise<{ deletedCount: number }> {
    const result = await this.prisma.temp_import_categories.deleteMany({
      where: { batch_id: batchId },
    });

    return { deletedCount: result.count };
  }

  /**
   * Helper method to get cell value from Excel
   */
  private getCellValue(cell: ExcelJS.Cell): string | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    return String(cell.value).trim();
  }
}
