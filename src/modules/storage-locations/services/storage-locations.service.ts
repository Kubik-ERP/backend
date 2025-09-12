import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStorageLocationDto } from '../dtos/create-storage-location.dto';
import { UpdateStorageLocationDto } from '../dtos/update-storage-location.dto';
import { GetStorageLocationsDto } from '../dtos/get-storage-locations.dto';
import {
  PreviewImportStorageLocationsDto,
  ImportStorageLocationsPreviewResponseDto,
  ExecuteImportStorageLocationsDto,
  ExecuteImportStorageLocationsResponseDto,
  DeleteBatchStorageLocationsDto,
  DeleteBatchStorageLocationsResponseDto,
} from '../dtos';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageLocationsService {
  private readonly logger = new Logger(StorageLocationsService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Generate storage location code based on location name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateLocationCode(
    locationName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from location name
      const words = locationName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingLocations =
        await this._prisma.master_storage_locations.findMany({
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
      existingLocations.forEach((location) => {
        const numberPart = location.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate location code: ${error.message}`);
      throw new BadRequestException('Failed to generate location code');
    }
  }

  /**
   * Validate duplicate location code within a store
   */
  private async validateDuplicateLocationCode(
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

    const existingLocation =
      await this._prisma.master_storage_locations.findFirst({
        where: whereCondition,
      });

    if (existingLocation) {
      throw new BadRequestException(`Location code '${code}' already exists`);
    }
  }

  async create(dto: CreateStorageLocationDto, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicate(dto.name, undefined, store_id);

    // Generate code if not provided
    const locationCode =
      dto.code || (await this.generateLocationCode(dto.name, store_id));

    // Validate for duplicate code within the store
    await this.validateDuplicateLocationCode(locationCode, undefined, store_id);

    const location = await this._prisma.master_storage_locations.create({
      data: {
        name: dto.name,
        code: locationCode,
        notes: dto.notes,
        store_id: store_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    this.logger.log(
      `Storage location created: ${location.name} with code: ${location.code}`,
    );
    return location;
  }

  async list(query: GetStorageLocationsDto, header: ICustomRequestHeaders) {
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
      this._prisma.master_storage_locations.findMany({
        where,
        orderBy: { [orderBy]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.master_storage_locations.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return { items, meta: { page, pageSize, total, totalPages } };
  }

  async detail(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const location = await this._prisma.master_storage_locations.findFirst({
      where: {
        id,
        store_id: store_id,
      },
    });
    if (!location)
      throw new NotFoundException(
        `Storage location with ID ${id} not found in this store`,
      );
    return location;
  }

  async update(
    id: string,
    dto: UpdateStorageLocationDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    const existing = await this.detail(id, header);

    if (dto.name && dto.name !== existing.name) {
      await this.ensureNotDuplicate(dto.name, id, store_id);
    }

    // Validate for duplicate location code if it's being updated
    if (dto.code && dto.code !== existing.code) {
      await this.validateDuplicateLocationCode(dto.code, id, store_id);
    }

    const updated = await this._prisma.master_storage_locations.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updated_at: new Date(),
      },
    });
    this.logger.log(`Storage location updated: ${updated.name}`);
    return updated;
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    const existing = await this.detail(id, header);

    // Prevent delete if supplier is linked to any inventory item in this store
    const linkedItemsCount = await this._prisma.master_inventory_items.count({
      where: {
        storage_location_id: id,
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
    });
    if (linkedItemsCount > 0) {
      throw new BadRequestException(
        'This storage location is linked to existing inventory items. Please remove or reassign the linked items before attemping to delete',
      );
    }

    await this._prisma.master_storage_locations.delete({
      where: {
        id: id,
        store_id: store_id,
      },
    });
    this.logger.log(`Storage location deleted: ${existing.name}`);
  }

  private async ensureNotDuplicate(
    name: string,
    excludeId?: string,
    storeId?: string,
  ) {
    const where: any = { name: { equals: name, mode: 'insensitive' } };
    if (excludeId) where.id = { not: excludeId };
    if (storeId) {
      where.store_id = storeId;
    }
    const existing = await this._prisma.master_storage_locations.findFirst({
      where,
    });
    if (existing) {
      throw new BadRequestException(
        `Storage location with name '${name}' already exists in this store`,
      );
    }
  }

  /**
   * Generate import template for storage locations
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<any> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Storage Locations
    const sheet = workbook.addWorksheet('Storage Locations');
    const columns = [
      { header: 'Location Name', key: 'location_name', width: 35 },
      { header: 'Location Code', key: 'location_code', width: 20 },
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
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT STORAGE LOCATIONS']);
    sheet.mergeCells('A1:C1'); // Merge across 3 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. Location Code is optional - if empty, it will be auto-generated.',
    ]);
    sheet.mergeCells('A2:C2'); // Merge across 3 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header (Location Name)
    const requiredCols = [1]; // Location Name
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Add sample row at row 4
    const sampleRow = sheet.getRow(4);
    sampleRow.getCell(1).value = 'Main Warehouse'; // Location Name
    sampleRow.getCell(2).value = 'MW0001'; // Location Code
    sampleRow.getCell(3).value = 'Primary storage area for inventory'; // Description

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
    dto: PreviewImportStorageLocationsDto,
    file: Express.Multer.File,
    header: ICustomRequestHeaders,
  ): Promise<ImportStorageLocationsPreviewResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const batchId = dto.batchId || uuidv4();

    // Delete existing batch data if batchId is provided
    if (dto.batchId) {
      await this._prisma.temp_import_inventory_storage_locations.deleteMany({
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

      const locationName = getCellValue(row.getCell(1)); // Location Name is column 1
      const locationCode = getCellValue(row.getCell(2)); // Location Code is column 2
      const description = getCellValue(row.getCell(3)); // Description is column 3

      // Skip empty rows or rows with only spaces
      if (!locationName && !locationCode && !description) {
        continue;
      }

      totalRows += 1;

      let isValid = true;
      const rowErrors: string[] = [];

      // Validate required fields
      if (!locationName) {
        isValid = false;
        rowErrors.push('Location name is required');
      }

      // Auto-generate location code if not provided and location name is valid
      let finalLocationCode = locationCode;
      if (!finalLocationCode && locationName) {
        try {
          finalLocationCode = await this.generateLocationCode(
            locationName,
            store_id,
          );
        } catch (error) {
          isValid = false;
          rowErrors.push('Failed to generate location code');
        }
      }

      // Check for duplicate location name
      if (locationName) {
        try {
          const existingName =
            await this._prisma.master_storage_locations.findFirst({
              where: {
                name: { equals: locationName, mode: 'insensitive' },
                store_id: store_id,
              },
            });

          if (existingName) {
            isValid = false;
            rowErrors.push(
              `Location name '${locationName}' already exists in this store`,
            );
          }
        } catch (error) {
          this.logger.error(`Error checking duplicate name: ${error.message}`);
          isValid = false;
          rowErrors.push('Error validating location name');
        }
      }

      // Check for duplicate location code in store if provided
      if (finalLocationCode) {
        try {
          const existingCode =
            await this._prisma.master_storage_locations.findFirst({
              where: {
                code: finalLocationCode,
                store_id: store_id,
              },
            });

          if (existingCode) {
            isValid = false;
            rowErrors.push(
              `Location code '${finalLocationCode}' already exists in this store`,
            );
          }
        } catch (error) {
          this.logger.error(`Error checking duplicate code: ${error.message}`);
          isValid = false;
          rowErrors.push('Error validating location code');
        }
      }

      const status = isValid ? 'valid' : 'invalid';
      const errorMessages = rowErrors.length > 0 ? rowErrors.join('; ') : null;

      if (isValid) {
        validData.push({
          id: batchId, // Using batch_id as temporary id like inventory items
          row_number: rowNumber,
          location_name: locationName,
          location_code: finalLocationCode || '', // Show the auto-generated code in preview
          description: description || null,
        });

        // Save to temp table
        await this._prisma.temp_import_inventory_storage_locations.create({
          data: {
            batch_id: batchId,
            row_number: rowNumber,
            status: 'valid',
            name: locationName,
            code: finalLocationCode || null, // Save the generated/provided code
            notes: description || null,
          },
        });
      } else {
        invalidData.push({
          id: batchId, // Using batch_id as temporary id like inventory items
          row_number: rowNumber,
          location_name: locationName || '',
          location_code: finalLocationCode || '', // Show the attempted code even for invalid data
          description: description || null,
          error_messages: errorMessages,
        });

        // Save to temp table with errors
        await this._prisma.temp_import_inventory_storage_locations.create({
          data: {
            batch_id: batchId,
            row_number: rowNumber,
            status: 'invalid',
            name: locationName || '',
            code: finalLocationCode || null, // Save the attempted code
            notes: description || null,
            error_messages: errorMessages,
          },
        });
      }
    }

    return {
      batchId: batchId,
      totalRows: totalRows,
      validRows: validData.length,
      invalidRows: invalidData.length,
      successData: validData,
      failedData: invalidData,
    };
  }

  /**
   * Execute import from temp table
   */
  public async executeImport(
    dto: ExecuteImportStorageLocationsDto,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportStorageLocationsResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const { batchId } = dto;

    // Get valid data from temp table
    const tempData =
      await this._prisma.temp_import_inventory_storage_locations.findMany({
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
        // Generate location code if not provided
        const locationCode =
          item.code || (await this.generateLocationCode(item.name, store_id));

        // Create storage location
        const location = await this._prisma.master_storage_locations.create({
          data: {
            name: item.name,
            code: locationCode,
            notes: item.notes,
            store_id: store_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        successCount += 1;
        this.logger.log(
          `Storage location imported: ${location.name} with code: ${location.code}`,
        );
      } catch (error) {
        failedItems.push({
          rowNumber: item.row_number,
          locationName: item.name,
          locationCode: item.code || '',
          errorMessage: error.message,
        });
        this.logger.error(
          `Failed to import storage location at row ${item.row_number}: ${error.message}`,
        );
      }
    }

    // Clean up temp data after successful import
    await this._prisma.temp_import_inventory_storage_locations.deleteMany({
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
    dto: DeleteBatchStorageLocationsDto,
  ): Promise<DeleteBatchStorageLocationsResponseDto> {
    const { batchId } = dto;

    const result =
      await this._prisma.temp_import_inventory_storage_locations.deleteMany({
        where: { batch_id: batchId },
      });

    return {
      success: true,
      message: 'Batch data deleted successfully',
      deletedCount: result.count,
    };
  }
}
