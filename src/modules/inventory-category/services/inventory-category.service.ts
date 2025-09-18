import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryCategoryDto } from '../dtos/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from '../dtos/update-inventory-category.dto';
import { GetInventoryCategoriesDto } from '../dtos/get-inventory-categories.dto';
import {
  PreviewImportInventoryCategoriesDto,
  ImportInventoryCategoriesPreviewResponseDto,
  ExecuteImportInventoryCategoriesDto,
  ExecuteImportInventoryCategoriesResponseDto,
  DeleteBatchInventoryCategoriesDto,
  DeleteBatchInventoryCategoriesResponseDto,
} from '../dtos';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryCategoryService {
  private readonly logger = new Logger(InventoryCategoryService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Generate inventory category code based on category name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateCategoryCode(
    categoryName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from category name
      const words = categoryName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingCategories =
        await this._prisma.master_inventory_categories.findMany({
          where: {
            code: {
              startsWith: prefix,
            },
            store_id: storeId,
          },
          select: {
            code: true,
          },
        });

      let maxCounter = 0;

      // Extract counter from existing codes and find the maximum
      existingCategories.forEach((category) => {
        const numberPart = category.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate category code: ${error.message}`);
      throw new BadRequestException('Failed to generate category code');
    }
  }

  /**
   * Validate duplicate category code within a store
   */
  private async validateDuplicateCategoryCode(
    code: string,
    excludeId?: string,
    storeId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      code,
    };

    if (excludeId) {
      whereCondition.id = {
        not: excludeId,
      };
    }

    if (storeId) {
      whereCondition.store_id = storeId;
    }

    const existingCategory =
      await this._prisma.master_inventory_categories.findFirst({
        where: whereCondition,
      });

    if (existingCategory) {
      throw new BadRequestException(`Category code '${code}' already exists`);
    }
  }

  public async create(
    dto: CreateInventoryCategoryDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Validate store exists
    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
    });
    if (!store) {
      throw new BadRequestException('Invalid store_id');
    }

    await this.ensureNotDuplicate(dto.name, undefined, store_id);

    // Generate code if not provided
    const categoryCode =
      dto.code || (await this.generateCategoryCode(dto.name, store_id));

    // Validate for duplicate code within the store
    await this.validateDuplicateCategoryCode(categoryCode, undefined, store_id);

    const isRetail = store.business_type === 'Retail';

    const category = await this._prisma.master_inventory_categories.create({
      data: {
        name: dto.name,
        code: categoryCode,
        notes: dto.notes,
        store_id: store_id,
        created_at: new Date(),
        updated_at: new Date(),
        // Ketika store adalah retail, maka akan dihubungan dengan categori produk
        ...(isRetail && {
          categories: {
            create: {
              category: dto.name,
              description: dto.notes,
              stores_id: store_id,
            },
          },
        }),
      },
    });

    this.logger.log(
      `Inventory category created: ${category.name} with code: ${category.code}`,
    );
    return category;
  }

  public async list(
    query: GetInventoryCategoriesDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const {
      page = 1,
      pageSize = 10,
      search,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      store_id: store_id,
    };

    if (search) {
      where.OR = [
        {
          name: { contains: search, mode: 'insensitive' },
        },
        {
          code: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this._prisma.master_inventory_categories.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.master_inventory_categories.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      meta: { page, pageSize, total, totalPages },
    };
  }

  public async detail(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Validate store exists
    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
    });
    if (!store) {
      throw new BadRequestException('Invalid store_id');
    }

    const category = await this._prisma.master_inventory_categories.findFirst({
      where: {
        id,
        store_id: store_id,
      },
    });
    if (!category)
      throw new NotFoundException(
        `Inventory category with ID ${id} not found in this store`,
      );
    return category;
  }

  public async update(
    id: string,
    dto: UpdateInventoryCategoryDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    if (dto.name && dto.name !== existing.name) {
      await this.ensureNotDuplicate(dto.name, id, store_id);
    }

    // Validate for duplicate category code if it's being updated
    if (dto.code && dto.code !== existing.code) {
      await this.validateDuplicateCategoryCode(dto.code, id, store_id);
    }

    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: {
        business_type: true,
      },
    });
    const isRetail = store?.business_type === 'Retail';

    const updated = await this._prisma.master_inventory_categories.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updated_at: new Date(),
        ...(isRetail && {
          categories: {
            update: {
              data: {
                ...(dto.name && { category: dto.name }),
                ...(dto.notes !== undefined && { description: dto.notes }),
              },
            },
          },
        }),
      },
    });
    this.logger.log(`Inventory category updated: ${updated.name}`);
    return updated;
  }

  public async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    const existing = await this.detail(id, header);

    // Prevent delete if category is linked to any inventory item in this store
    const linkedItemsCount = await this._prisma.master_inventory_items.count({
      where: {
        category_id: id,
        store_id: store_id,
      },
    });
    if (linkedItemsCount > 0) {
      throw new BadRequestException(
        'Inventory category cannot be deleted because it is linked to one or more inventory items in this store',
      );
    }

    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: {
        business_type: true,
      },
    });
    const isRetail = store?.business_type === 'Retail';
    if (isRetail) {
      // delete category
      await this._prisma.categories.delete({
        where: {
          master_inventory_category_id: id,
          stores_id: store_id,
        },
      });
    }

    await this._prisma.master_inventory_categories.delete({
      where: {
        id: id,
        store_id: store_id,
      },
    });

    this.logger.log(`Inventory category deleted: ${existing.name}`);
  }

  /**
   * Generate import template for inventory categories
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<any> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Inventory Categories
    const sheet = workbook.addWorksheet('Inventory Categories');
    const columns = [
      { header: 'Category Name', key: 'category_name', width: 35 },
      { header: 'Category Code', key: 'category_code', width: 20 },
      { header: 'Description', key: 'description', width: 50 },
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

    // Apply background color to all columns with data (A to C = 3 columns)
    for (let col = 1; col <= 3; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add title row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT INVENTORY CATEGORIES']);
    sheet.mergeCells('A1:C1'); // Merge across 3 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. Category Code is optional - if empty, it will be auto-generated.',
    ]);
    sheet.mergeCells('A2:C2'); // Merge across 3 columns
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
    sampleRow.getCell(1).value = 'Electronics'; // Category Name
    sampleRow.getCell(2).value = 'EL001'; // Category Code
    sampleRow.getCell(3).value = 'Electronic items and gadgets'; // Description

    // Style sample row to indicate it's an example
    sampleRow.font = { italic: true, color: { argb: 'FF666666' } };

    // Auto-fit columns to ensure all data is visible
    sheet.columns.forEach((column) => {
      if (column.width && column.width < 15) {
        column.width = 15;
      }
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Preview import data from Excel file
   */
  public async previewImport(
    dto: PreviewImportInventoryCategoriesDto,
    file: Express.Multer.File,
    header: ICustomRequestHeaders,
  ): Promise<ImportInventoryCategoriesPreviewResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const batchId = dto.batchId || uuidv4();

    // Delete existing batch data if batchId is provided
    if (dto.batchId) {
      await this._prisma.temp_import_inventory_categories.deleteMany({
        where: { batch_id: batchId },
      });
    }

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new BadRequestException('No worksheet found in the Excel file');
    }

    const validData: any[] = [];
    const invalidData: any[] = [];
    let totalRows = 0;

    // Helper function to safely get cell value
    const getCellValue = (cell: any): string => {
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }

      if (typeof cell.value === 'object') {
        // Handle hyperlink objects and other Excel objects
        if (cell.value.text !== undefined) {
          return String(cell.value.text).trim();
        }
        if (cell.value.result !== undefined) {
          return String(cell.value.result).trim();
        }
        return String(cell.value).trim();
      }

      return String(cell.value).trim();
    };

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

      const categoryName = getCellValue(row.getCell(1)); // Category Name is column 1
      const categoryCode = getCellValue(row.getCell(2)); // Category Code is column 2
      const description = getCellValue(row.getCell(3)); // Description is column 3

      // Skip empty rows or rows with only spaces
      if (!categoryName && !categoryCode && !description) {
        continue;
      }

      totalRows += 1;

      let isValid = true;
      const rowErrors: string[] = [];

      // Validate required fields
      if (!categoryName) {
        isValid = false;
        rowErrors.push('Category name is required');
      }

      // Auto-generate category code if not provided and category name is valid
      let finalCategoryCode = categoryCode;
      if (!finalCategoryCode && categoryName) {
        try {
          finalCategoryCode = await this.generateCategoryCode(
            categoryName,
            store_id,
          );
        } catch (error) {
          isValid = false;
          rowErrors.push('Failed to generate category code');
        }
      }

      // Check for duplicate category name
      if (categoryName) {
        try {
          const existingName =
            await this._prisma.master_inventory_categories.findFirst({
              where: {
                name: { equals: categoryName, mode: 'insensitive' },
                store_id: store_id,
              },
            });

          if (existingName) {
            isValid = false;
            rowErrors.push(
              `Category name '${categoryName}' already exists in this store`,
            );
          }
        } catch (error) {
          this.logger.error(`Error checking duplicate name: ${error.message}`);
          isValid = false;
          rowErrors.push('Error validating category name');
        }
      }

      // Check for duplicate category code in store if provided
      if (finalCategoryCode) {
        try {
          const existingCode =
            await this._prisma.master_inventory_categories.findFirst({
              where: {
                code: finalCategoryCode,
                store_id: store_id,
              },
            });

          if (existingCode) {
            isValid = false;
            rowErrors.push(
              `Category code '${finalCategoryCode}' already exists in this store`,
            );
          }
        } catch (error) {
          this.logger.error(`Error checking duplicate code: ${error.message}`);
          isValid = false;
          rowErrors.push('Error validating category code');
        }
      }

      const status = isValid ? 'valid' : 'invalid';
      const errorMessages = rowErrors.length > 0 ? rowErrors.join('; ') : null;

      if (isValid) {
        validData.push({
          id: batchId, // Using batch_id as temporary id like inventory items
          row_number: rowNumber,
          category_name: categoryName,
          category_code: finalCategoryCode || '', // Show the auto-generated code in preview
          description: description || null,
        });

        // Save to temp table
        await this._prisma.temp_import_inventory_categories.create({
          data: {
            batch_id: batchId,
            row_number: rowNumber,
            status: 'valid',
            name: categoryName,
            code: finalCategoryCode || null, // Save the generated/provided code
            notes: description || null,
          },
        });
      } else {
        invalidData.push({
          id: batchId, // Using batch_id as temporary id like inventory items
          row_number: rowNumber,
          category_name: categoryName || '',
          category_code: finalCategoryCode || '', // Show the attempted code even for invalid data
          description: description || null,
          error_messages: errorMessages,
        });

        // Save to temp table with errors
        await this._prisma.temp_import_inventory_categories.create({
          data: {
            batch_id: batchId,
            row_number: rowNumber,
            status: 'invalid',
            name: categoryName || '',
            code: finalCategoryCode || null, // Save the attempted code
            notes: description || null,
            error_messages: errorMessages,
          },
        });
      }
    }

    return {
      batch_id: batchId,
      total_rows: totalRows,
      valid_rows: validData.length,
      invalid_rows: invalidData.length,
      success_data: validData,
      failed_data: invalidData,
    };
  }

  /**
   * Execute import from temp table
   */
  public async executeImport(
    dto: ExecuteImportInventoryCategoriesDto,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportInventoryCategoriesResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const { batchId } = dto;

    // Get valid data from temp table
    const tempData =
      await this._prisma.temp_import_inventory_categories.findMany({
        where: {
          batch_id: batchId,
          status: 'valid',
        },
        orderBy: { row_number: 'asc' },
      });

    if (tempData.length === 0) {
      throw new BadRequestException(
        'No valid data found for the provided batch ID',
      );
    }

    let successCount = 0;
    const failedItems: any[] = [];

    // Process each row
    for (const item of tempData) {
      try {
        // Generate category code if not provided
        const categoryCode =
          item.code || (await this.generateCategoryCode(item.name, store_id));

        const store = await this._prisma.stores.findUnique({
          where: { id: store_id },
          select: {
            business_type: true,
          },
        });
        const isRetail = store?.business_type === 'Retail';

        // Create category
        const category = await this._prisma.master_inventory_categories.create({
          data: {
            name: item.name,
            code: categoryCode,
            notes: item.notes,
            store_id: store_id,
            created_at: new Date(),
            updated_at: new Date(),
            // Ketika store adalah retail, maka akan dihubungan dengan categori produk
            ...(isRetail && {
              categories: {
                create: {
                  category: item.name,
                  description: item.notes,
                  stores_id: store_id,
                },
              },
            }),
          },
        });

        successCount += 1;
        this.logger.log(
          `Category imported: ${category.name} with code: ${category.code}`,
        );
      } catch (error) {
        failedItems.push({
          rowNumber: item.row_number,
          categoryName: item.name,
          categoryCode: item.code || '',
          errorMessage: error.message,
        });
        this.logger.error(
          `Failed to import category at row ${item.row_number}: ${error.message}`,
        );
      }
    }

    // Clean up temp data after successful import
    await this._prisma.temp_import_inventory_categories.deleteMany({
      where: { batch_id: batchId },
    });

    return {
      totalProcessed: tempData.length,
      successCount,
      failureCount: failedItems.length,
      failedItems,
    };
  }

  /**
   * Delete batch data from temp table
   */
  public async deleteBatch(
    dto: DeleteBatchInventoryCategoriesDto,
  ): Promise<DeleteBatchInventoryCategoriesResponseDto> {
    const { batchId } = dto;

    const result =
      await this._prisma.temp_import_inventory_categories.deleteMany({
        where: { batch_id: batchId },
      });

    return {
      success: true,
      message: 'Batch data deleted successfully',
      deletedCount: result.count,
    };
  }

  private async ensureNotDuplicate(
    name: string,
    excludeId?: string,
    storeId?: string,
  ) {
    const where: any = {
      name: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) where.id = { not: excludeId };
    if (storeId) {
      where.store_id = storeId;
    }
    const existing = await this._prisma.master_inventory_categories.findFirst({
      where,
    });
    if (existing) {
      throw new BadRequestException(
        `Inventory category with name '${name}' already exists in this store`,
      );
    }
  }
}
