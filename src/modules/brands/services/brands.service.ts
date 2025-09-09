import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto } from '../dtos/create-brand.dto';
import { UpdateBrandDto } from '../dtos/update-brand.dto';
import { GetBrandsDto } from '../dtos/get-brands.dto';
import { ImportBrandsPreviewResponseDto } from '../dtos/import-preview.dto';
import { ExecuteImportBrandsResponseDto } from '../dtos/execute-import.dto';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * @description Create a new brand
   */
  /**
   * Generate brand code based on brand name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateBrandCode(
    brandName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from brand name
      const words = brandName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingBrands = await this._prisma.master_brands.findMany({
        where: {
          code: {
            startsWith: prefix,
          },
          stores_has_master_brands: {
            some: {
              stores_id: storeId,
            },
          },
        },
        select: {
          code: true,
        },
      });

      let maxCounter = 0;

      // Extract counter from existing codes and find the maximum
      existingBrands.forEach((brand) => {
        const numberPart = brand.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate brand code: ${error.message}`);
      throw new BadRequestException('Failed to generate brand code');
    }
  }

  /**
   * Validate duplicate brand code within a store
   */
  private async validateDuplicateBrandCode(
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
      whereCondition.stores_has_master_brands = {
        some: {
          stores_id: storeId,
        },
      };
    }

    const existingBrand = await this._prisma.master_brands.findFirst({
      where: whereCondition,
    });

    if (existingBrand) {
      throw new BadRequestException(`Brand code '${code}' already exists`);
    }
  }

  public async createBrand(
    createBrandDto: CreateBrandDto,
    header: ICustomRequestHeaders,
  ) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Validate for duplicate brand within the store
      await this.validateDuplicateBrand(
        createBrandDto.brandName,
        undefined,
        store_id,
      );

      // Generate code if not provided
      const brandCode =
        createBrandDto.code ||
        (await this.generateBrandCode(createBrandDto.brandName, store_id));

      // Validate for duplicate code within the store
      await this.validateDuplicateBrandCode(brandCode, undefined, store_id);

      const brand = await this._prisma.master_brands.create({
        data: {
          brand_name: createBrandDto.brandName,
          code: brandCode,
          notes: createBrandDto.notes,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create relationship with store
      await this._prisma.stores_has_master_brands.create({
        data: {
          stores_id: store_id,
          master_brands_id: brand.id,
        },
      });

      this.logger.log(
        `Brand created successfully: ${brand.brand_name} with code: ${brand.code}`,
      );
      return brand;
    } catch (error) {
      this.logger.error(`Failed to create brand: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create brand');
    }
  }

  /**
   * @description Get all brands with filtering and pagination
   */
  public async getBrands(
    getBrandsDto: GetBrandsDto,
    header: ICustomRequestHeaders,
  ) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const {
        page = 1,
        pageSize = 10,
        search,
        orderBy = 'created_at',
        orderDirection = 'desc',
      } = getBrandsDto;

      const skip = (page - 1) * pageSize;

      // Build where condition
      const whereCondition: any = {
        stores_has_master_brands: {
          some: {
            stores_id: store_id,
          },
        },
      };

      if (search) {
        whereCondition.OR = [
          {
            brand_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Get brands with count
      const [brands, total] = await Promise.all([
        this._prisma.master_brands.findMany({
          where: whereCondition,
          orderBy: {
            [orderBy]: orderDirection,
          },
          skip,
          take: pageSize,
        }),
        this._prisma.master_brands.count({
          where: whereCondition,
        }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        items: brands,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get brands: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get brands');
    }
  }

  /**
   * @description Get brand by ID
   */
  public async getBrandById(id: string, header: ICustomRequestHeaders) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const brand = await this._prisma.master_brands.findFirst({
        where: {
          id,
          stores_has_master_brands: {
            some: {
              stores_id: store_id,
            },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return brand;
    } catch (error) {
      this.logger.error(`Failed to get brand by ID: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to get brand');
    }
  }

  /**
   * @description Update brand by ID
   */
  public async updateBrand(
    id: string,
    updateBrandDto: UpdateBrandDto,
    header: ICustomRequestHeaders,
  ) {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if brand exists and belongs to the store
      const existingBrand = await this.getBrandById(id, header);

      // Validate for duplicate brand name if it's being updated
      if (
        updateBrandDto.brandName &&
        updateBrandDto.brandName !== existingBrand.brand_name
      ) {
        await this.validateDuplicateBrand(
          updateBrandDto.brandName,
          id,
          store_id,
        );
      }

      // Validate for duplicate brand code if it's being updated
      if (updateBrandDto.code && updateBrandDto.code !== existingBrand.code) {
        await this.validateDuplicateBrandCode(
          updateBrandDto.code,
          id,
          store_id,
        );
      }

      const updatedBrand = await this._prisma.master_brands.update({
        where: { id },
        data: {
          ...(updateBrandDto.brandName && {
            brand_name: updateBrandDto.brandName,
          }),
          ...(updateBrandDto.code && {
            code: updateBrandDto.code,
          }),
          ...(updateBrandDto.notes !== undefined && {
            notes: updateBrandDto.notes,
          }),
          updated_at: new Date(),
        },
      });

      this.logger.log(`Brand updated successfully: ${updatedBrand.brand_name}`);
      return updatedBrand;
    } catch (error) {
      this.logger.error(`Failed to update brand: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update brand');
    }
  }

  /**
   * @description Delete brand by ID
   */
  public async deleteBrand(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if brand exists and belongs to the store
      const existingBrand = await this.getBrandById(id, header);

      // Prevent delete if brand is linked to any inventory item in this store
      const linkedItemsCount = await this._prisma.master_inventory_items.count({
        where: {
          brand_id: id,
          stores_has_master_inventory_items: { some: { stores_id: store_id } },
        },
      });
      if (linkedItemsCount > 0) {
        throw new BadRequestException(
          'Brand cannot be deleted because it is linked to one or more inventory items in this store',
        );
      }

      // Delete the store-brand relationship first
      await this._prisma.stores_has_master_brands.deleteMany({
        where: {
          master_brands_id: id,
          stores_id: store_id,
        },
      });
      const otherStoreRelations =
        await this._prisma.stores_has_master_brands.count({
          where: {
            master_brands_id: id,
          },
        });

      if (otherStoreRelations === 0) {
        await this._prisma.master_brands.delete({
          where: { id },
        });
      }

      this.logger.log(
        `Brand deleted successfully: ${existingBrand.brand_name}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete brand: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete brand');
    }
  }

  /**
   * @description Validate duplicate brand within a store
   */
  private async validateDuplicateBrand(
    brandName: string,
    excludeId?: string,
    storeId?: string,
  ): Promise<void> {
    const whereCondition: any = {
      brand_name: {
        equals: brandName,
        mode: 'insensitive',
      },
    };

    if (excludeId) {
      whereCondition.id = {
        not: excludeId,
      };
    }

    if (storeId) {
      whereCondition.stores_has_master_brands = {
        some: {
          stores_id: storeId,
        },
      };
    }

    const existingBrand = await this._prisma.master_brands.findFirst({
      where: whereCondition,
    });

    if (existingBrand) {
      throw new BadRequestException(
        `Brand with name '${brandName}' already exists in this store`,
      );
    }
  }

  /**
   * Helper method to safely get cell value from Excel
   */
  private getCellValue(cell: any): string {
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle hyperlink objects
    if (typeof cell.value === 'object' && cell.value.hyperlink) {
      return cell.value.text || cell.value.hyperlink || '';
    }

    // Handle rich text objects
    if (typeof cell.value === 'object' && cell.value.richText) {
      return cell.value.richText.map((rt: any) => rt.text || '').join('');
    }

    // Handle other objects by converting to string
    if (typeof cell.value === 'object') {
      return String(cell.value);
    }

    return String(cell.value).trim();
  }

  /**
   * Generate import template for brands
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<Buffer> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Brands
    const sheet = workbook.addWorksheet('Brands');
    const columns = [
      { header: 'Brand Name', key: 'brand_name', width: 30 },
      { header: 'Brand Code', key: 'brand_code', width: 20 },
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

    // Apply background color to all columns with data (A to C = 3 columns)
    for (let col = 1; col <= 3; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add title row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT BRANDS']);
    sheet.mergeCells('A1:C1'); // Merge across 3 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. Brand Code is optional - if empty, it will be auto-generated.',
    ]);
    sheet.mergeCells('A2:C2'); // Merge across 3 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header (Brand Name)
    const requiredCols = [1]; // Brand Name
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Add sample row at row 4
    const sampleRow = sheet.getRow(4);
    sampleRow.getCell(1).value = 'Apple'; // Brand Name
    sampleRow.getCell(2).value = 'AP001'; // Brand Code
    sampleRow.getCell(3).value = 'Technology brand'; // Description

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
  ): Promise<ImportBrandsPreviewResponseDto> {
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
        await this._prisma.temp_import_brands.deleteMany({
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

        const brandName = this.getCellValue(row.getCell(1));
        const brandCode = this.getCellValue(row.getCell(2));
        const description = this.getCellValue(row.getCell(3));

        let isValid = true;
        const rowErrors: string[] = [];

        // Generate brand code if not provided (same as createBrand logic)
        let finalBrandCode = brandCode;
        if (!finalBrandCode && brandName) {
          try {
            finalBrandCode = await this.generateBrandCode(brandName, store_id);
          } catch (error) {
            this.logger.error(
              `Error generating brand code for ${brandName}: ${error.message}`,
            );
            isValid = false;
            rowErrors.push('Error generating brand code');
          }
        }

        // Validate required fields
        if (!brandName) {
          isValid = false;
          rowErrors.push('Brand name is required');
        } else if (brandName.length > 150) {
          isValid = false;
          rowErrors.push('Brand name exceeds maximum length (150 characters)');
        }

        // Validate brand code if provided
        if (finalBrandCode && finalBrandCode.length > 255) {
          isValid = false;
          rowErrors.push('Brand code exceeds maximum length (255 characters)');
        }

        // Check for duplicate brand name in store
        if (brandName) {
          try {
            const existingBrand = await this._prisma.master_brands.findFirst({
              where: {
                brand_name: brandName,
                stores_has_master_brands: {
                  some: { stores_id: store_id },
                },
              },
            });

            if (existingBrand) {
              isValid = false;
              rowErrors.push(
                `Brand name '${brandName}' already exists in this store`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error checking duplicate brand: ${error.message}`,
            );
            isValid = false;
            rowErrors.push('Error validating brand name');
          }
        }

        // Check for duplicate brand code in store if provided
        if (finalBrandCode) {
          try {
            const existingCode = await this._prisma.master_brands.findFirst({
              where: {
                code: finalBrandCode,
                stores_has_master_brands: {
                  some: { stores_id: store_id },
                },
              },
            });

            if (existingCode) {
              isValid = false;
              rowErrors.push(
                `Brand code '${finalBrandCode}' already exists in this store`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error checking duplicate code: ${error.message}`,
            );
            isValid = false;
            rowErrors.push('Error validating brand code');
          }
        }

        const status = isValid ? 'valid' : 'invalid';
        const errorMessages =
          rowErrors.length > 0 ? rowErrors.join('; ') : null;

        const rowData = {
          batch_id: batchId,
          row_number: rowNumber,
          brand_name: brandName || '',
          brand_code: finalBrandCode || '', // Use the generated/provided brand code
          description: description || null,
          status,
          error_messages: errorMessages,
        };

        if (isValid) {
          validData.push({
            id: batchId, // Using batch_id as temporary id like inventory items
            row_number: rowNumber,
            brand_name: brandName,
            brand_code: finalBrandCode || '', // Show the auto-generated code in preview
            description: description || null,
          });

          // Save to temp table
          await this._prisma.temp_import_brands.create({
            data: {
              batch_id: batchId,
              row_number: rowNumber,
              status: 'valid',
              brand_name: brandName,
              code: finalBrandCode || null, // Save the generated/provided code
              notes: description || null,
            },
          });
        } else {
          invalidData.push({
            id: batchId, // Using batch_id as temporary id like inventory items
            row_number: rowNumber,
            brand_name: brandName || '',
            brand_code: finalBrandCode || '', // Show the attempted code even for invalid data
            description: description || null,
            error_messages: errorMessages,
          });

          // Save to temp table with errors
          await this._prisma.temp_import_brands.create({
            data: {
              batch_id: batchId,
              row_number: rowNumber,
              status: 'invalid',
              brand_name: brandName || '',
              code: finalBrandCode || null, // Save the attempted code
              notes: description || null,
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
   * Execute import of brands from temp table to master table
   */
  public async executeImport(
    batchId: string,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportBrandsResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Get valid temp records
    const tempRecords = await this._prisma.temp_import_brands.findMany({
      where: {
        batch_id: batchId,
        status: 'valid',
      },
      orderBy: { row_number: 'asc' },
    });

    if (tempRecords.length === 0) {
      throw new BadRequestException('No valid records found for this batch');
    }

    const failedBrands: Array<{
      rowNumber: number;
      brandName: string;
      brandCode: string;
      errorMessage: string;
    }> = [];

    let successCount = 0;

    for (const tempRecord of tempRecords) {
      try {
        // Generate brand code if not provided
        let brandCode = tempRecord.code;
        if (!brandCode) {
          brandCode = await this.generateBrandCode(
            tempRecord.brand_name,
            store_id,
          );
        }

        // Double-check for duplicates before creating
        const existingBrand = await this._prisma.master_brands.findFirst({
          where: {
            brand_name: tempRecord.brand_name,
            stores_has_master_brands: {
              some: { stores_id: store_id },
            },
          },
        });

        if (existingBrand) {
          failedBrands.push({
            rowNumber: tempRecord.row_number,
            brandName: tempRecord.brand_name,
            brandCode: brandCode,
            errorMessage: 'Brand already exists',
          });
          continue;
        }

        const existingCode = await this._prisma.master_brands.findFirst({
          where: {
            code: brandCode,
            stores_has_master_brands: {
              some: { stores_id: store_id },
            },
          },
        });

        if (existingCode) {
          failedBrands.push({
            rowNumber: tempRecord.row_number,
            brandName: tempRecord.brand_name,
            brandCode: brandCode,
            errorMessage: 'Brand code already exists',
          });
          continue;
        }

        // Create brand using existing createBrand logic
        const createDto: CreateBrandDto = {
          brandName: tempRecord.brand_name,
          code: brandCode,
          notes: tempRecord.notes || undefined,
        };

        await this.createBrand(createDto, header);
        successCount += 1;
      } catch (error) {
        this.logger.error(
          `Error importing brand at row ${tempRecord.row_number}: ${error.message}`,
        );
        failedBrands.push({
          rowNumber: tempRecord.row_number,
          brandName: tempRecord.brand_name,
          brandCode: tempRecord.code || '',
          errorMessage: error.message || 'Unknown error occurred',
        });
      }
    }

    // Clean up temp records after import
    await this._prisma.temp_import_brands.deleteMany({
      where: { batch_id: batchId },
    });

    return {
      totalProcessed: tempRecords.length,
      successCount,
      failureCount: failedBrands.length,
      failedBrands,
    };
  }

  /**
   * Delete batch data from temp table
   */
  public async deleteBatch(batchId: string): Promise<{ deletedCount: number }> {
    const result = await this._prisma.temp_import_brands.deleteMany({
      where: { batch_id: batchId },
    });

    return { deletedCount: result.count };
  }
}
