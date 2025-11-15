import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateInventoryItemDto,
  CreateStockAdjustmentDto,
  GetInventoryItemsDto,
  GetStockAdjustmentsDto,
  ImportPreviewResponseDto,
  StockAdjustmentActionDto,
  UpdateInventoryItemDto,
  UpdateStockAdjustmentDto,
} from '../dtos';

type OrderByKey = 'id' | 'created_at' | 'name' | 'updated_at' | 'sku';

@Injectable()
export class InventoryItemsService {
  /**
   * Generate Excel import template for inventory items with reference sheets and dropdowns
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<Buffer> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Fetch master data filtered by store with code field and store info
    const [brands, categories, storageLocations, suppliers, store] =
      await Promise.all([
        this._prisma.master_brands.findMany({
          where: {
            store_id: store_id,
          },
          select: { id: true, brand_name: true, code: true },
        }),
        this._prisma.master_inventory_categories.findMany({
          where: {
            store_id: store_id,
          },
          select: { id: true, name: true, code: true },
        }),
        this._prisma.master_storage_locations.findMany({
          where: {
            store_id: store_id,
          },
          select: { id: true, name: true, code: true },
        }),
        this._prisma.master_suppliers.findMany({
          where: {
            store_id: store_id,
          },
          select: { id: true, supplier_name: true, code: true },
        }),
        this._prisma.stores.findUnique({
          where: { id: store_id },
          select: { business_type: true },
        }),
      ]);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Inventory Items
    const sheet = workbook.addWorksheet('Inventory Items');
    const columns = [
      { header: 'Item Name', key: 'item_name', width: 30 },
      { header: 'Brand', key: 'brand', width: 35 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Category', key: 'category', width: 35 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Stock Quantity', key: 'stock_quantity', width: 18 },
      {
        header: 'Minimum Stock Quantity',
        key: 'minimum_stock_quantity',
        width: 25,
      },
      { header: 'Reorder Level', key: 'reorder_level', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 18 },
      { header: 'Storage Location', key: 'storage_location', width: 35 },
      { header: 'Price Per Unit', key: 'price_per_unit', width: 18 },
      { header: 'Price Grosir', key: 'price_grosir', width: 18 },
      { header: 'Supplier', key: 'supplier', width: 35 },
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

    // Apply background color to all columns with data (A to O = 15 columns)
    for (let col = 1; col <= 15; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add dropdowns for master data columns with proper validation using "code | name" format
    const addDropdown = (
      col: number,
      refSheet: string,
      refCol: string,
      count: number,
    ) => {
      const colLetter = sheet.getColumn(col).letter;
      for (let row = 4; row <= 1000; row++) {
        sheet.getCell(`${colLetter}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${refSheet}'!$${refCol}$2:$${refCol}$${count + 1}`],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Invalid Selection',
          error: 'Please pick a value from the drop-down list.',
        };
      }
    };

    // Sheet 2: Brand Reference with 2 columns (Code and Name)
    const brandSheet = workbook.addWorksheet('Brand Reference');
    brandSheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Brand Name', key: 'name', width: 35 },
    ];
    brands.forEach((b) =>
      brandSheet.addRow({
        code: b.code,
        name: b.brand_name,
      }),
    );

    // Sheet 3: Category Reference with 2 columns (Code and Name)
    const catSheet = workbook.addWorksheet('Category Reference');
    catSheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Category Name', key: 'name', width: 35 },
    ];
    categories.forEach((c) =>
      catSheet.addRow({
        code: c.code,
        name: c.name,
      }),
    );

    // Sheet 4: Storage Location Reference with 2 columns (Code and Name)
    const storageSheet = workbook.addWorksheet('Storage Location Reference');
    storageSheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Storage Location Name', key: 'name', width: 40 },
    ];
    storageLocations.forEach((s) =>
      storageSheet.addRow({
        code: s.code,
        name: s.name,
      }),
    );

    // Sheet 5: Supplier Reference with 2 columns (Code and Name)
    const supplierSheet = workbook.addWorksheet('Supplier Reference');
    supplierSheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Supplier Name', key: 'name', width: 35 },
    ];
    suppliers.forEach((s) =>
      supplierSheet.addRow({
        code: s.code,
        name: s.supplier_name,
      }),
    );

    // Create hidden dropdown lists with "code | name" format for validation
    const brandDropdownSheet = workbook.addWorksheet('Brand_Dropdown', {
      state: 'hidden',
    });
    brandDropdownSheet.columns = [
      { header: 'Brand List', key: 'brand_list', width: 50 },
    ];
    brands.forEach((b) =>
      brandDropdownSheet.addRow({
        brand_list: `${b.code} | ${b.brand_name}`,
      }),
    );

    const categoryDropdownSheet = workbook.addWorksheet('Category_Dropdown', {
      state: 'hidden',
    });
    categoryDropdownSheet.columns = [
      { header: 'Category List', key: 'category_list', width: 50 },
    ];
    categories.forEach((c) =>
      categoryDropdownSheet.addRow({
        category_list: `${c.code} | ${c.name}`,
      }),
    );

    const storageDropdownSheet = workbook.addWorksheet('Storage_Dropdown', {
      state: 'hidden',
    });
    storageDropdownSheet.columns = [
      { header: 'Storage List', key: 'storage_list', width: 55 },
    ];
    storageLocations.forEach((s) =>
      storageDropdownSheet.addRow({
        storage_list: `${s.code} | ${s.name}`,
      }),
    );

    const supplierDropdownSheet = workbook.addWorksheet('Supplier_Dropdown', {
      state: 'hidden',
    });
    supplierDropdownSheet.columns = [
      { header: 'Supplier List', key: 'supplier_list', width: 50 },
    ];
    suppliers.forEach((s) =>
      supplierDropdownSheet.addRow({
        supplier_list: `${s.code} | ${s.supplier_name}`,
      }),
    );

    // Add dropdown validation using hidden sheets with "code | name" format
    addDropdown(2, 'Brand_Dropdown', 'A', brands.length); // Brand column 2
    addDropdown(5, 'Category_Dropdown', 'A', categories.length); // Category column 5
    addDropdown(12, 'Storage_Dropdown', 'A', storageLocations.length); // Storage Location column 12
    addDropdown(15, 'Supplier_Dropdown', 'A', suppliers.length); // Supplier column 15

    // Add notes row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT INVENTORY ITEMS']);
    sheet.mergeCells('A1:O1'); // Updated to O1 for 15 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. For Brand, Category, Storage Location, and Supplier columns, please select from dropdown list using "code | name" format (check reference sheets)',
    ]);
    sheet.mergeCells('A2:O2'); // Updated to O2 for 15 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header - updated column positions (without Store ID)
    const requiredCols = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 15]; // Item Name, Brand, SKU, Category, Unit, Stock Qty, Min Stock, Reorder, Storage, Price, Supplier
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Prepare sample data using first item from each reference for dropdown validation with "code | name" format
    const sampleBrand =
      brands.length > 0 ? `${brands[0].code} | ${brands[0].brand_name}` : '';
    const sampleCategory =
      categories.length > 0
        ? `${categories[0].code} | ${categories[0].name}`
        : '';
    const sampleStorage =
      storageLocations.length > 0
        ? `${storageLocations[0].code} | ${storageLocations[0].name}`
        : '';
    const sampleSupplier =
      suppliers.length > 0
        ? `${suppliers[0].code} | ${suppliers[0].supplier_name}`
        : '';

    // Add sample row at row 4 using dropdown-compatible data with "code | name" format
    // Conditional priceGrosir value based on store business type
    const samplePriceGrosir = store?.business_type === 'Retail' ? 13000 : null;

    const sampleRow = sheet.insertRow(4, [
      'Sample Item Name', // Item Name
      sampleBrand, // Brand - use first brand from database for dropdown compatibility
      'SAMPLE123', // Barcode
      'SKU001', // SKU
      sampleCategory, // Category - use first category from database for dropdown compatibility
      'pcs', // Unit
      'Sample notes', // Notes
      100, // Stock Quantity
      10, // Minimum Stock Quantity
      20, // Reorder Level
      new Date('2025-12-12'), // Expiry Date - as Date object
      sampleStorage, // Storage Location - use first storage from database for dropdown compatibility
      15000, // Price Per Unit
      samplePriceGrosir, // Price Grosir - only for Retail stores
      sampleSupplier, // Supplier - use first supplier from database for dropdown compatibility
    ]);

    // Format the expiry date column (column 11) as date with YYYY-MM-DD format
    const expiryDateCell = sampleRow.getCell(11);
    expiryDateCell.numFmt = 'yyyy-mm-dd';

    // Apply date formatting to the entire expiry date column for future entries
    for (let row = 5; row <= 1000; row++) {
      const cell = sheet.getCell(`K${row}`); // Column K is the 11th column (Expiry Date)
      cell.numFmt = 'yyyy-mm-dd';
    }

    // Return as buffer
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }

  /**
   * Preview import data from Excel file
   */
  public async previewImport(
    file: Express.Multer.File,
    header: ICustomRequestHeaders,
    existingBatchId?: string,
  ): Promise<ImportPreviewResponseDto> {
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
        await this._prisma.$executeRaw`
          DELETE FROM temp_import_inventory_items 
          WHERE batch_id = ${existingBatchId}::uuid
        `;
        this.logger.log(
          `Deleted previous import data for batch: ${existingBatchId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error deleting previous batch data: ${error.message}`,
        );
        // Continue with the import even if deletion fails
      }
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet('Inventory Items');
    if (!worksheet) {
      throw new BadRequestException(
        'Worksheet "Inventory Items" not found in the Excel file',
      );
    }

    // Extract data starting from row 4 (after headers)
    const rows: any[] = [];
    let currentRowNumber = 4; // Start from row 4

    worksheet.eachRow((row, rowNum) => {
      if (rowNum >= 4) {
        // Skip empty rows - check if row has values and they are not all empty
        const rowValues = row.values as ExcelJS.CellValue[];
        const hasData = rowValues
          .slice(1)
          .some(
            (cell) =>
              cell !== null && cell !== undefined && String(cell).trim() !== '',
          );

        if (hasData) {
          const rowData = {
            row_number: currentRowNumber,
            item_name: this.getCellValue(row.getCell(1)),
            brand: this.getCellValue(row.getCell(2)),
            barcode: this.getCellValue(row.getCell(3)),
            sku: this.getCellValue(row.getCell(4)),
            category: this.getCellValue(row.getCell(5)),
            unit: this.getCellValue(row.getCell(6)),
            notes: this.getCellValue(row.getCell(7)),
            stock_quantity: this.getNumericValue(row.getCell(8)),
            minimum_stock_quantity: this.getNumericValue(row.getCell(9)),
            reorder_level: this.getNumericValue(row.getCell(10)),
            expiry_date: this.getDateValue(row.getCell(11)),
            expiry_date_string: this.getCellValue(row.getCell(11)), // Keep original string for validation
            storage_location: this.getCellValue(row.getCell(12)),
            price_per_unit: this.getNumericValue(row.getCell(13)),
            price_grosir: this.getNumericValue(row.getCell(14)),
            supplier: this.getCellValue(row.getCell(15)),
          };
          rows.push(rowData);
          currentRowNumber += 1;
        }
      }
    });

    // Check for duplicate SKUs and Barcodes within the batch
    const skuCountMap = new Map<string, number>();
    const barcodeCountMap = new Map<string, number>();
    const skuRowMap = new Map<string, number[]>();
    const barcodeRowMap = new Map<string, number[]>();

    rows.forEach((row) => {
      if (row.sku?.trim()) {
        const sku = row.sku.trim().toLowerCase();
        skuCountMap.set(sku, (skuCountMap.get(sku) || 0) + 1);
        if (!skuRowMap.has(sku)) skuRowMap.set(sku, []);
        skuRowMap.get(sku)?.push(row.row_number);
      }

      if (row.barcode?.trim()) {
        const barcode = row.barcode.trim().toLowerCase();
        barcodeCountMap.set(barcode, (barcodeCountMap.get(barcode) || 0) + 1);
        if (!barcodeRowMap.has(barcode)) barcodeRowMap.set(barcode, []);
        barcodeRowMap.get(barcode)?.push(row.row_number);
      }
    });

    // Get store business type for validation
    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: { business_type: true },
    });

    // Process and validate each row
    const processedData = await Promise.all(
      rows.map(async (rowData) => {
        const errors: string[] = [];
        const processedRow = { ...rowData };

        // Validation and processing
        if (!processedRow.item_name?.trim()) {
          errors.push('Item name is required');
        }

        if (processedRow.brand?.trim()) {
          // Extract code from "code | Name" format
          const brandCode = this.extractCodeFromReference(processedRow.brand);
          if (brandCode) {
            // Verify brand exists and belongs to store
            const brandExists = await this._prisma.master_brands.findFirst({
              where: {
                code: brandCode,
                store_id: store_id,
              },
            });
            if (!brandExists) {
              errors.push('Brand not found or does not belong to this store');
            }
          } else {
            errors.push('Invalid brand format. Expected format: "code | Name"');
          }
        } else {
          errors.push('Brand is required');
        }

        if (processedRow.sku?.trim()) {
          const sku = processedRow.sku.trim().toLowerCase();

          // Check for duplicate in current batch
          if (skuCountMap.get(sku)! > 1) {
            const duplicateRows = skuRowMap.get(sku) || [];
            errors.push(
              `SKU '${processedRow.sku}' is duplicated in rows: ${duplicateRows.join(', ')}`,
            );
          }

          // Check for duplicate SKU in current store
          try {
            const existingSku =
              await this._prisma.master_inventory_items.findFirst({
                where: {
                  sku: { equals: processedRow.sku.trim(), mode: 'insensitive' },
                  store_id: store_id,
                },
              });
            if (existingSku) {
              errors.push(
                `SKU '${processedRow.sku}' already exists in this store`,
              );
            }
          } catch (error) {
            errors.push('Error validating SKU uniqueness');
          }
        } else {
          errors.push('SKU is required');
        }

        // Validate barcode uniqueness if provided
        if (processedRow.barcode?.trim()) {
          const barcode = processedRow.barcode.trim().toLowerCase();

          // Check for duplicate in current batch
          if (barcodeCountMap.get(barcode)! > 1) {
            const duplicateRows = barcodeRowMap.get(barcode) || [];
            errors.push(
              `Barcode '${processedRow.barcode}' is duplicated in rows: ${duplicateRows.join(', ')}`,
            );
          }

          try {
            const existingBarcode =
              await this._prisma.master_inventory_items.findFirst({
                where: {
                  barcode: {
                    equals: processedRow.barcode.trim(),
                    mode: 'insensitive',
                  },
                  store_id: store_id,
                },
              });
            if (existingBarcode) {
              errors.push(
                `Barcode '${processedRow.barcode}' already exists in this store`,
              );
            }
          } catch (error) {
            errors.push('Error validating barcode uniqueness');
          }
        }

        if (processedRow.category?.trim()) {
          const categoryCode = this.extractCodeFromReference(
            processedRow.category,
          );
          if (categoryCode) {
            const categoryExists =
              await this._prisma.master_inventory_categories.findFirst({
                where: {
                  code: categoryCode,
                  store_id: store_id,
                },
              });
            if (!categoryExists) {
              errors.push(
                'Category not found or does not belong to this store',
              );
            }
          } else {
            errors.push(
              'Invalid category format. Expected format: "code | Name"',
            );
          }
        } else {
          errors.push('Category is required');
        }

        if (!processedRow.unit?.trim()) {
          errors.push('Unit is required');
        }

        if (
          processedRow.stock_quantity === null ||
          processedRow.stock_quantity === undefined ||
          isNaN(processedRow.stock_quantity)
        ) {
          errors.push('Stock quantity is required and must be a valid number');
        } else if (processedRow.stock_quantity < 0) {
          errors.push('Stock quantity must be a positive number');
        }

        if (
          processedRow.minimum_stock_quantity === null ||
          processedRow.minimum_stock_quantity === undefined ||
          isNaN(processedRow.minimum_stock_quantity)
        ) {
          errors.push(
            'Minimum stock quantity is required and must be a valid number',
          );
        } else if (processedRow.minimum_stock_quantity < 0) {
          errors.push('Minimum stock quantity must be a positive number');
        }

        if (
          processedRow.reorder_level === null ||
          processedRow.reorder_level === undefined ||
          isNaN(processedRow.reorder_level)
        ) {
          errors.push('Reorder level is required and must be a valid number');
        } else if (processedRow.reorder_level < 0) {
          errors.push('Reorder level must be a positive number');
        }

        if (processedRow.storage_location?.trim()) {
          const storageCode = this.extractCodeFromReference(
            processedRow.storage_location,
          );
          if (storageCode) {
            const storageExists =
              await this._prisma.master_storage_locations.findFirst({
                where: {
                  code: storageCode,
                  store_id: store_id,
                },
              });
            if (!storageExists) {
              errors.push(
                'Storage location not found or does not belong to this store',
              );
            }
          } else {
            errors.push(
              'Invalid storage location format. Expected format: "code | Name"',
            );
          }
        } else {
          errors.push('Storage location is required');
        }

        if (
          processedRow.price_per_unit === null ||
          processedRow.price_per_unit === undefined ||
          isNaN(processedRow.price_per_unit)
        ) {
          errors.push('Price per unit is required and must be a valid number');
        } else if (processedRow.price_per_unit <= 0) {
          errors.push('Price per unit must be greater than 0');
        }

        // Validate price_grosir based on store business type
        const hasPriceGrosir =
          processedRow.price_grosir !== null &&
          processedRow.price_grosir !== undefined &&
          !isNaN(processedRow.price_grosir) &&
          processedRow.price_grosir > 0; // Only consider as "filled" if greater than 0

        if (hasPriceGrosir) {
          if (store?.business_type !== 'Retail') {
            errors.push('Price Grosir can only be filled for Retail stores');
          }
          // For Retail stores, any positive value is valid (no additional validation needed)
        }

        // Validate expiry_date if provided
        if (
          processedRow.expiry_date_string &&
          processedRow.expiry_date_string.trim()
        ) {
          try {
            // First validate the string format
            this.validateDateFormat(processedRow.expiry_date_string.trim());

            // Then check if the parsed date is valid and not in the past
            if (processedRow.expiry_date instanceof Date) {
              if (isNaN(processedRow.expiry_date.getTime())) {
                errors.push('Invalid expiry date format');
              } else if (processedRow.expiry_date < new Date()) {
                errors.push('Expiry date cannot be in the past');
              }
            }
          } catch (error) {
            errors.push(error.message || 'Invalid expiry date format');
          }
        }

        if (processedRow.supplier?.trim()) {
          const supplierCode = this.extractCodeFromReference(
            processedRow.supplier,
          );
          if (supplierCode) {
            const supplierExists =
              await this._prisma.master_suppliers.findFirst({
                where: {
                  code: supplierCode,
                  store_id: store_id,
                },
              });
            if (!supplierExists) {
              errors.push(
                'Supplier not found or does not belong to this store',
              );
            }
          } else {
            errors.push(
              'Invalid supplier format. Expected format: "code | Name"',
            );
          }
        } else {
          errors.push('Supplier is required');
        }

        const status = errors.length === 0 ? 'valid' : 'invalid';
        const errorMessages = errors.length > 0 ? errors.join('; ') : null;

        return {
          ...processedRow,
          batch_id: batchId,
          status,
          error_messages: errorMessages,
        };
      }),
    );

    // Save to temporary table - use raw query since Prisma model might not be generated yet
    const tempData = processedData.map((row) => ({
      batch_id: batchId,
      row_number: row.row_number,
      status: row.status,
      item_name: row.item_name,
      brand: row.brand,
      barcode: row.barcode,
      sku: row.sku,
      category: row.category,
      unit: row.unit,
      notes: row.notes,
      stock_quantity: row.stock_quantity,
      minimum_stock_quantity: row.minimum_stock_quantity,
      reorder_level: row.reorder_level,
      expiry_date: row.expiry_date,
      storage_location: row.storage_location,
      price_per_unit: row.price_per_unit,
      price_grosir: row.price_grosir,
      supplier: row.supplier,
      error_messages: row.error_messages,
    }));

    for (const data of tempData) {
      await this._prisma.$executeRaw`
        INSERT INTO temp_import_inventory_items (
          batch_id, row_number, status, item_name, brand, barcode, sku, category, unit, notes,
          stock_quantity, minimum_stock_quantity, reorder_level, expiry_date, storage_location,
          price_per_unit, price_grosir, supplier, error_messages
        ) VALUES (
          ${data.batch_id}::uuid, ${data.row_number}, ${data.status}, ${data.item_name}, ${data.brand},
          ${data.barcode}, ${data.sku}, ${data.category}, ${data.unit}, ${data.notes},
          ${data.stock_quantity}, ${data.minimum_stock_quantity}, ${data.reorder_level}, ${data.expiry_date},
          ${data.storage_location}, ${data.price_per_unit}, ${data.price_grosir}, ${data.supplier}, ${data.error_messages}
        )
      `;
    }

    // Separate valid and invalid data
    const validData = processedData.filter((row) => row.status === 'valid');
    const invalidData = processedData.filter((row) => row.status === 'invalid');

    return {
      batch_id: batchId,
      total_rows: processedData.length,
      valid_rows: validData.length,
      invalid_rows: invalidData.length,
      success_data: validData.map((row) => ({
        id: row.batch_id, // Using batch_id as temporary id
        row_number: row.row_number,
        item_name: row.item_name,
        brand: row.brand,
        barcode: row.barcode,
        sku: row.sku,
        category: row.category,
        unit: row.unit,
        notes: row.notes,
        stock_quantity: row.stock_quantity,
        minimum_stock_quantity: row.minimum_stock_quantity,
        reorder_level: row.reorder_level,
        expiry_date: this.formatDateToYYYYMMDD(row.expiry_date),
        storage_location: row.storage_location,
        price_per_unit: row.price_per_unit,
        price_grosir: row.price_grosir,
        supplier: row.supplier,
      })),
      failed_data: invalidData.map((row) => ({
        id: row.batch_id, // Using batch_id as temporary id
        row_number: row.row_number,
        item_name: row.item_name,
        brand: row.brand,
        barcode: row.barcode,
        sku: row.sku,
        category: row.category,
        unit: row.unit,
        notes: row.notes,
        stock_quantity: row.stock_quantity,
        minimum_stock_quantity: row.minimum_stock_quantity,
        reorder_level: row.reorder_level,
        expiry_date: this.formatDateToYYYYMMDD(row.expiry_date),
        storage_location: row.storage_location,
        price_per_unit: row.price_per_unit,
        price_grosir: row.price_grosir,
        supplier: row.supplier,
        error_messages: row.error_messages,
      })),
    };
  }

  /**
   * Execute import of inventory items from temp table to master table
   */
  public async executeImport(batchId: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Validate that batch exists
    const batchCount = await this._prisma.temp_import_inventory_items.count({
      where: { batch_id: batchId },
    });

    if (batchCount === 0) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Check if there are any invalid records in the batch
    const invalidRecords =
      await this._prisma.temp_import_inventory_items.findMany({
        where: {
          batch_id: batchId,
          status: 'invalid',
        },
        select: {
          row_number: true,
        },
        orderBy: {
          row_number: 'asc',
        },
      });

    if (invalidRecords.length > 0) {
      const invalidRows = invalidRecords
        .map((r) => r.row_number.toString())
        .join(', ');
      throw new BadRequestException(
        `Cannot import batch with invalid records. Found ${invalidRecords.length} invalid record(s) at row(s): ${invalidRows}. Please fix the errors and re-upload the file.`,
      );
    }

    // Get all valid items from temp table
    const tempItems = await this._prisma.temp_import_inventory_items.findMany({
      where: {
        batch_id: batchId,
        status: 'valid',
      },
      orderBy: {
        row_number: 'asc',
      },
    });

    let successCount = 0;
    let failureCount = 0;
    const failedItems: Array<{
      rowNumber: number;
      itemName: string;
      sku: string;
      errorMessage: string;
    }> = [];

    // Process each item
    for (const tempItem of tempItems) {
      try {
        // Extract codes from reference strings and get IDs
        const brandCode = this.extractCodeFromReference(tempItem.brand || '');
        const categoryCode = this.extractCodeFromReference(
          tempItem.category || '',
        );
        const storageLocationCode = this.extractCodeFromReference(
          tempItem.storage_location || '',
        );
        const supplierCode = this.extractCodeFromReference(
          tempItem.supplier || '',
        );

        // Validate extracted codes
        if (
          !brandCode ||
          !categoryCode ||
          !storageLocationCode ||
          !supplierCode
        ) {
          throw new Error('Invalid reference format in master data');
        }

        // Validate required fields
        if (!tempItem.item_name || !tempItem.sku) {
          throw new Error('Required fields are missing');
        }

        // Get brand_id
        const brand = await this._prisma.master_brands.findFirst({
          where: {
            code: brandCode,
            store_id: store_id,
          },
          select: { id: true },
        });

        // Get category_id
        const category =
          await this._prisma.master_inventory_categories.findFirst({
            where: {
              code: categoryCode,
              store_id: store_id,
            },
            select: { id: true },
          });

        // Get storage_location_id
        const storageLocation =
          await this._prisma.master_storage_locations.findFirst({
            where: {
              code: storageLocationCode,
              store_id: store_id,
            },
            select: { id: true },
          });

        // Get supplier_id
        const supplier = await this._prisma.master_suppliers.findFirst({
          where: {
            code: supplierCode,
            store_id: store_id,
          },
          select: { id: true },
        });

        if (!brand || !category || !storageLocation || !supplier) {
          throw new Error('Required master data not found');
        }

        // Create DTO for the existing create method
        const createDto = {
          name: tempItem.item_name,
          brandId: brand.id,
          barcode: tempItem.barcode || undefined,
          sku: tempItem.sku,
          categoryId: category.id,
          unit: tempItem.unit || '',
          notes: tempItem.notes || undefined,
          stockQuantity: tempItem.stock_quantity || 0,
          reorderLevel: tempItem.reorder_level || 0,
          minimumStockQuantity: tempItem.minimum_stock_quantity || 0,
          expiryDate: tempItem.expiry_date
            ? (this.formatDateToYYYYMMDD(tempItem.expiry_date) ?? undefined)
            : undefined,
          storageLocationId: storageLocation.id,
          pricePerUnit: Number(tempItem.price_per_unit) || 0,
          priceGrosir: Number(tempItem.price_grosir) || 0,
          supplierId: supplier.id,
        };

        // Use the existing create method
        await this.create(createDto, header);
        successCount += 1;
      } catch (error) {
        failureCount += 1;
        failedItems.push({
          rowNumber: tempItem.row_number,
          itemName: tempItem.item_name || 'Unknown',
          sku: tempItem.sku || 'Unknown',
          errorMessage: error.message || 'Unknown error occurred',
        });

        this.logger.error(
          `Failed to import item at row ${tempItem.row_number}: ${error.message}`,
        );
      }
    }

    // Clean up: Delete imported data from temp table
    await this._prisma.$executeRaw`
      DELETE FROM temp_import_inventory_items 
      WHERE batch_id = ${batchId}::uuid
    `;

    this.logger.log(
      `Import completed: ${successCount} success, ${failureCount} failed`,
    );

    return {
      totalProcessed: successCount + failureCount,
      successCount,
      failureCount,
      failedItems,
    };
  }

  // Helper methods for Excel data processing
  private getCellValue(cell: ExcelJS.Cell): string | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;

    // Special handling for Date objects to maintain yyyy-mm-dd format
    if (cell.value instanceof Date) {
      const date = cell.value;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return String(cell.value).trim();
  }

  private getNumericValue(cell: ExcelJS.Cell): number | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    const value = Number(cell.value);
    return isNaN(value) ? null : value;
  }

  private getDateValue(cell: ExcelJS.Cell): Date | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;

    if (cell.value instanceof Date) {
      return cell.value;
    }

    // Try to parse date string
    const dateStr = String(cell.value).trim();
    if (!dateStr) return null;

    // Try common date formats
    const parsedDate = new Date(dateStr);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private extractCodeFromReference(reference: string): string | null {
    if (!reference) return null;
    const parts = reference.split(' | ');
    return parts.length >= 2 ? parts[0].trim() : null;
  }

  private formatDateToYYYYMMDD(date: Date | null): string | null {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private readonly logger = new Logger(InventoryItemsService.name);
  // Columns that are guaranteed to exist in DB for inventory_stock_adjustments
  private readonly stockAdjustmentSafeSelect = {
    id: true,
    master_inventory_items_id: true,
    stores_id: true,
    action: true,
    adjustment_quantity: true,
    notes: true,
    previous_quantity: true,
    new_quantity: true,
    created_at: true,
    updated_at: true,
    created_by: true,
    users: {
      select: {
        id: true,
        username: true,
        email: true,
        fullname: true,
      },
    },
  } as const;

  constructor(private readonly _prisma: PrismaService) {}

  public async create(
    dto: CreateInventoryItemDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Validate expiry date format if provided
    if (dto.expiryDate) {
      this.validateDateFormat(dto.expiryDate);
    }

    if (dto.sku) {
      await this.ensureNotDuplicateSku(dto.sku, undefined, store_id);
    }

    // Check if store is retail type
    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: { business_type: true },
    });

    const isRetail = store?.business_type === 'Retail';

    const item = await this._prisma.$transaction(async (tx) => {
      const item = await this._prisma.master_inventory_items.create({
        data: {
          name: dto.name,
          brand_id: dto.brandId,
          barcode: dto.barcode,
          sku: dto.sku ?? '',
          category_id: dto.categoryId,
          unit: dto.unit,
          notes: dto.notes,
          stock_quantity: dto?.stockQuantity ?? 0,
          reorder_level: dto.reorderLevel,
          minimum_stock_quantity: dto.minimumStockQuantity,
          expiry_date: dto.expiryDate ? new Date(dto.expiryDate) : null,
          storage_location_id: dto.storageLocationId,
          price_per_unit: dto.pricePerUnit,
          supplier_id: dto.supplierId,
          store_id: store_id,
          price_grosir: dto.priceGrosir,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create unit conversions if provided
      if (dto.conversions && dto.conversions.length > 0) {
        for (const conversion of dto.conversions) {
          // Validate that conversion is an object with required fields
          if (
            !conversion ||
            typeof conversion !== 'object' ||
            !conversion.unitName ||
            !conversion.value ||
            isNaN(Number(conversion.value))
          ) {
            throw new BadRequestException(
              `Invalid conversion data: ${JSON.stringify(conversion)}. Expected format: {"unitName":"string","unitSymbol":"string","value":number}`,
            );
          }

          const conversionValue = Number(conversion.value);
          if (conversionValue <= 0) {
            throw new BadRequestException(
              `Conversion value must be greater than 0: ${conversionValue}`,
            );
          }

          await tx.master_inventory_item_conversions.create({
            data: {
              item_id: item.id,
              unit_name: String(conversion.unitName).trim(),
              unit_symbol: conversion.unitSymbol
                ? String(conversion.unitSymbol).trim()
                : null,
              conversion_value: conversionValue,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }

      if (isRetail) await this.upsertCatalog(tx, dto, store_id, item.id);

      return item;
    });

    this.logger.log(`Inventory item created: ${item.name}`);
    return this.toPlainItem(item);
  }

  public async list(
    query: GetInventoryItemsDto,
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
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this._prisma.master_inventory_items.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          master_inventory_categories: { select: { id: true, name: true } },
          master_brands: { select: { id: true, brand_name: true } },
          unit: true,
          stock_quantity: true,
          reorder_level: true,
          minimum_stock_quantity: true,
          price_per_unit: true,
          price_grosir: true,
          expiry_date: true,
          master_suppliers: { select: { id: true, supplier_name: true } },
          master_storage_locations: { select: { id: true, name: true } },
          margin: true,
          markup: true,
          created_at: true,
          purchase_order_items: {
            take: 1,
            orderBy: { purchase_orders: { order_date: 'asc' } },
            select: { purchase_orders: { select: { order_date: true } } },
          },
        },
        orderBy: { [orderBy as OrderByKey]: orderDirection },
        skip,
        take: pageSize,
      }),
      this._prisma.master_inventory_items.count({ where }),
    ]);

    let mapped = items.map((it) => ({
      id: it.id,
      sku: it.sku,
      item_name: it.name,
      category: it.master_inventory_categories?.name ?? null,
      brand: it.master_brands?.brand_name ?? null,
      unit: it.unit,
      stock_quantity: it.stock_quantity,
      reorder_level: it.reorder_level,
      minimum_stock_quantity: it.minimum_stock_quantity,
      price_per_unit: it.price_per_unit,
      price_grosir: it.price_grosir,
      expiry_date: it.expiry_date,
      supplier: it.master_suppliers?.supplier_name ?? null,
      storage_location: it.master_storage_locations?.name ?? null,
      category_id: it.master_inventory_categories?.id ?? null,
      brand_id: it.master_brands?.id ?? null,
      supplier_id: it.master_suppliers?.id ?? null,
      storage_location_id: it.master_storage_locations?.id ?? null,
      margin: it.margin,
      markup: it.markup,
      created_at: it.created_at,
    }));

    const totalPages = Math.ceil(total / pageSize);
    const plainItems = mapped.map((i) => this.toPlainItem(i));
    return { items: plainItems, meta: { page, pageSize, total, totalPages } };
  }

  public async detail(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const item = await this._prisma.master_inventory_items.findFirst({
      where: {
        id,
        store_id: store_id,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
        master_inventory_categories: { select: { id: true, name: true } },
        master_brands: { select: { id: true, brand_name: true } },
        master_storage_locations: { select: { id: true, name: true } },
        unit: true,
        stock_quantity: true,
        reorder_level: true,
        minimum_stock_quantity: true,
        expiry_date: true,
        price_per_unit: true,
        master_suppliers: { select: { id: true, supplier_name: true } },
        created_at: true,
        notes: true,
        price_grosir: true,
        products: { select: { picture_url: true } },
        margin: true,
        markup: true,
        master_inventory_item_conversions: {
          select: {
            id: true,
            unit_name: true,
            unit_symbol: true,
            conversion_value: true,
          },
        },
      },
    });
    if (!item)
      throw new NotFoundException(
        `Inventory item with ID ${id} not found in this store`,
      );

    const mapped = {
      id: item.id,
      sku: item.sku,
      item_name: item.name,
      barcode: item.barcode,
      category: item.master_inventory_categories?.name ?? null,
      brand: item.master_brands?.brand_name ?? null,
      unit: item.unit,
      stock_quantity: item.stock_quantity,
      reorder_level: item.reorder_level,
      minimum_stock_quantity: item.minimum_stock_quantity,
      price_per_unit: item.price_per_unit,
      expiry_date: item.expiry_date,
      storage_location: item.master_storage_locations?.name ?? null,
      supplier: item.master_suppliers?.supplier_name ?? null,
      category_id: item.master_inventory_categories?.id ?? null,
      brand_id: item.master_brands?.id ?? null,
      supplier_id: item.master_suppliers?.id ?? null,
      storage_location_id: item.master_storage_locations?.id ?? null,
      created_at: item.created_at,
      notes: item.notes,
      price_grosir: item.price_grosir,
      margin: item.margin,
      markup: item.markup,
      conversions: item.master_inventory_item_conversions.map((conv) => ({
        id: conv.id,
        unitName: conv.unit_name,
        unitSymbol: conv.unit_symbol,
        value: Number(conv.conversion_value),
      })),
      imageUrl: item.products?.picture_url ?? null,
    };

    return this.toPlainItem(mapped);
  }

  public async update(
    id: string,
    dto: UpdateInventoryItemDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    if (dto.sku && dto.sku !== existing.sku) {
      await this.ensureNotDuplicateSku(dto.sku, id, store_id);
    }

    // Validate expiry date format if provided
    if (dto.expiryDate) {
      this.validateDateFormat(dto.expiryDate);
    }

    // Helper function to validate UUID or return null
    const validateUUID = (value: string | null | undefined): string | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      // Check if it's a valid UUID format (36 characters with dashes)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value) ? value : null;
    };

    // Build update data object dynamically to avoid TypeScript issues
    const updateData: any = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.brandId !== undefined) {
      const validatedBrandId = validateUUID(dto.brandId);
      if (validatedBrandId === null) {
        updateData.brand_id = null;
      } else {
        updateData.brand_id = validatedBrandId;
      }
    }
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.categoryId !== undefined) {
      const validatedCategoryId = validateUUID(dto.categoryId);
      if (validatedCategoryId === null) {
        updateData.category_id = null;
      } else {
        updateData.category_id = validatedCategoryId;
      }
    }
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.stockQuantity !== undefined) {
      updateData.stock_quantity = dto.stockQuantity;
    }
    if (dto.reorderLevel !== undefined) {
      updateData.reorder_level = dto.reorderLevel;
    }
    if (dto.minimumStockQuantity !== undefined) {
      updateData.minimum_stock_quantity = dto.minimumStockQuantity;
    }
    if (dto.expiryDate !== undefined) {
      updateData.expiry_date = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }
    if (dto.storageLocationId !== undefined) {
      const validatedStorageId = validateUUID(dto.storageLocationId);
      if (validatedStorageId === null) {
        updateData.storage_location_id = null;
      } else {
        updateData.storage_location_id = validatedStorageId;
      }
    }
    if (dto.pricePerUnit !== undefined) {
      updateData.price_per_unit = dto.pricePerUnit;
    }
    if (dto.priceGrosir !== undefined) {
      updateData.price_grosir = dto.priceGrosir;
    }
    if (dto.supplierId !== undefined) {
      const validatedSupplierId = validateUUID(dto.supplierId);
      if (validatedSupplierId === null) {
        updateData.supplier_id = null;
      } else {
        updateData.supplier_id = validatedSupplierId;
      }
    }

    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: {
        business_type: true,
      },
    });
    const isRetail = store?.business_type === 'Retail';

    const updated = await this._prisma.$transaction(async (tx) => {
      const updated = await tx.master_inventory_items.update({
        where: { id },
        data: updateData,
      });

      // Handle unit conversions update if provided
      if (dto.conversions !== undefined) {
        // Delete existing conversions for this item
        await tx.master_inventory_item_conversions.deleteMany({
          where: { item_id: id },
        });

        // Create new conversions if provided
        if (dto.conversions && dto.conversions.length > 0) {
          for (const conversion of dto.conversions) {
            // Validate that conversion is an object with required fields
            if (
              !conversion ||
              typeof conversion !== 'object' ||
              !conversion.unitName ||
              !conversion.value ||
              isNaN(Number(conversion.value))
            ) {
              throw new BadRequestException(
                `Invalid conversion data: ${JSON.stringify(conversion)}. Expected format: {"unitName":"string","unitSymbol":"string","value":number}`,
              );
            }

            const conversionValue = Number(conversion.value);
            if (conversionValue <= 0) {
              throw new BadRequestException(
                `Conversion value must be greater than 0: ${conversionValue}`,
              );
            }

            await tx.master_inventory_item_conversions.create({
              data: {
                item_id: id,
                unit_name: String(conversion.unitName).trim(),
                unit_symbol: conversion.unitSymbol
                  ? String(conversion.unitSymbol).trim()
                  : null,
                conversion_value: conversionValue,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }
        }
      }

      if (isRetail) await this.upsertCatalog(tx, dto, store_id, id);

      return updated;
    });

    this.logger.log(`Inventory item updated: ${updated.name}`);
    return this.toPlainItem(updated);
  }

  private getOrInsertCategoryProduct = async (
    tx: Prisma.TransactionClient,
    inventoryCategoryId: string,
    storeId: string,
  ) => {
    // cek, apakah inventory category sudah terhubung dengan category product
    const categoryProduct = await this._prisma.categories.findFirst({
      where: {
        master_inventory_category_id: inventoryCategoryId,
        stores_id: storeId,
      },
    });

    // jika category product sudah ada, maka langsung return id nya
    if (categoryProduct) return categoryProduct.id;

    // jika belum, maka buat terlebih dahulu dan hubungkan
    const inventoryCategory =
      await tx.master_inventory_categories.findFirstOrThrow({
        where: {
          id: inventoryCategoryId,
          store_id: storeId,
        },
      });

    const existingCategory = await tx.categories.findFirst({
      where: {
        category: inventoryCategory.name,
        stores_id: storeId,
      },
    });
    if (existingCategory) {
      throw new BadRequestException(
        `Category product with name '${inventoryCategory.name}' already exists in this store`,
      );
    }

    const categoryCatalogCreated = await tx.categories.create({
      data: {
        category: inventoryCategory.name,
        description: inventoryCategory.notes,
        stores_id: storeId,
        master_inventory_category_id: inventoryCategoryId,
      },
      select: {
        id: true,
      },
    });

    return categoryCatalogCreated.id;
  };

  private upsertProduct = async (
    tx: Prisma.TransactionClient,
    dto: UpdateInventoryItemDto,
    storeId: string,
    inventoryItemId?: string,
  ) => {
    const existing = await tx.products.findFirst({
      where: { name: dto.name, stores_id: storeId },
    });
    if (existing && existing.master_inventory_item_id !== inventoryItemId) {
      throw new BadRequestException(
        `Product with name '${dto.name}' already exists in this store`,
      );
    }
    const result = await tx.products.upsert({
      where: {
        master_inventory_item_id: inventoryItemId,
      },
      update: {
        name: dto.name,
        price: dto.pricePerUnit,
        barcode: dto.barcode,
        stores_id: storeId,
        picture_url: dto.image,
      },
      create: {
        name: dto.name,
        price: dto.pricePerUnit,
        barcode: dto.barcode,
        stores_id: storeId,
        picture_url: dto.image,
        master_inventory_item_id: inventoryItemId,
      },
    });

    return result.id;
  };

  private upsertCatalog = async (
    tx: Prisma.TransactionClient,
    dto: UpdateInventoryItemDto,
    storeId: string,
    inventoryItemId?: string,
  ) => {
    if (!dto.categoryId) {
      throw new BadRequestException('Category ID is required');
    }

    // reset categories product
    await tx.categories_has_products.deleteMany({
      where: {
        products: {
          master_inventory_item_id: inventoryItemId,
          stores_id: storeId,
        },
      },
    });

    const categoryId = await this.getOrInsertCategoryProduct(
      tx,
      dto.categoryId,
      storeId,
    );

    const productId = await this.upsertProduct(
      tx,
      dto,
      storeId,
      inventoryItemId,
    );

    // update category product
    await tx.categories_has_products.create({
      data: {
        categories_id: categoryId,
        products_id: productId,
      },
    });
  };

  public async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    // Check if store is retail type
    const store = await this._prisma.stores.findUnique({
      where: { id: store_id },
      select: { business_type: true },
    });

    const isRetail = store?.business_type === 'Retail';

    if (isRetail) {
      await this._prisma.products.delete({
        where: {
          master_inventory_item_id: id,
          stores_id: store_id,
        },
      });
    }

    await this._prisma.master_inventory_items.delete({
      where: {
        id,
        store_id: store_id,
      },
    });

    this.logger.log(`Inventory item deleted: ${existing.name}`);
  }

  // Stock Adjustment: enriched item detail for header section
  public async stockAdjustmentDetail(
    id: string,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const item = await this._prisma.master_inventory_items.findFirst({
      where: {
        id,
        store_id: store_id,
      },
      select: {
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        stock_quantity: true,
        reorder_level: true,
        minimum_stock_quantity: true,
        expiry_date: true,
        price_per_unit: true,
        master_brands: { select: { brand_name: true } },
        master_inventory_categories: { select: { name: true } },
        master_storage_locations: { select: { name: true } },
        master_suppliers: { select: { supplier_name: true } },
      },
    });
    if (!item)
      throw new NotFoundException(
        `Inventory item with ID ${id} not found in this store`,
      );

    // Convert price_per_unit to number and return only fields shown in UI
    const priceField: any = (item as any).price_per_unit;
    const pricePerUnit =
      priceField &&
      typeof priceField === 'object' &&
      typeof priceField.toNumber === 'function'
        ? priceField.toNumber()
        : priceField;

    return {
      name: item.name,
      sku: item.sku,
      brandName: item.master_brands?.brand_name ?? null,
      barcode: item.barcode,
      categoryName: item.master_inventory_categories?.name ?? null,
      unit: item.unit,
      stockQuantity: item.stock_quantity,
      reorderLevel: item.reorder_level,
      minimumStockQuantity: item.minimum_stock_quantity,
      expiryDate: item.expiry_date
        ? item.expiry_date.toISOString().split('T')[0]
        : null, // Format as YYYY-MM-DD
      storageLocationName: item.master_storage_locations?.name ?? null,
      pricePerUnit,
      supplierName: item.master_suppliers?.supplier_name ?? null,
    };
  }

  // Stock Adjustment: list tracking log
  public async listStockAdjustments(
    itemId: string,
    query: GetStockAdjustmentsDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    // ensure item belongs to store
    await this.detail(itemId, header);

    const { page = 1, pageSize = 10, action } = query;
    const skip = (page - 1) * pageSize;
    // Build minimal filter to avoid issues: only by item and store; optionally by action
    const where: any = {
      master_inventory_items_id: itemId,
      stores_id: store_id,
      ...(action ? { action } : {}),
    };

    const [rows, total] = await Promise.all([
      this._prisma.inventory_stock_adjustments.findMany({
        where,
        select: this.stockAdjustmentSafeSelect,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
      this._prisma.inventory_stock_adjustments.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return { items: rows, meta: { page, pageSize, total, totalPages } };
  }

  // Stock Adjustment: create
  public async addStockAdjustment(
    itemId: string,
    dto: CreateStockAdjustmentDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const item = await this._prisma.master_inventory_items.findFirst({
      where: {
        id: itemId,
        store_id: store_id,
      },
    });
    if (!item)
      throw new NotFoundException(
        `Inventory item with ID ${itemId} not found in this store`,
      );

    const slId = item.storage_location_id;
    const prevQty = item.stock_quantity;
    const delta =
      dto.action === StockAdjustmentActionDto.STOCK_IN
        ? dto.adjustmentQuantity
        : -dto.adjustmentQuantity;
    const newQty = prevQty + delta;
    if (newQty < 0) {
      throw new BadRequestException(
        'Resulting stock quantity cannot be negative',
      );
    }

    const result = await this._prisma.$transaction(async (tx) => {
      const updatedItem = await tx.master_inventory_items.update({
        where: { id: itemId },
        data: { stock_quantity: newQty, updated_at: new Date() },
      });
      const adjData: any = {
        master_inventory_items_id: itemId,
        stores_id: store_id,
        action: dto.action as any,
        adjustment_quantity: dto.adjustmentQuantity,
        notes: dto.notes,
        previous_quantity: prevQty,
        new_quantity: newQty,
        created_by: header.user?.id || null, // Add created_by field with user ID
      };
      // if (slId) adjData.storage_location_id = slId;
      const adj = await tx.inventory_stock_adjustments.create({
        data: adjData as any,
        select: this.stockAdjustmentSafeSelect,
      });
      return { updatedItem, adj };
    });

    return {
      item: this.toPlainItem(result.updatedItem),
      adjustment: result.adj,
    };
  }

  // Stock Adjustment: update
  public async updateStockAdjustment(
    itemId: string,
    adjustmentId: string,
    dto: UpdateStockAdjustmentDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');
    await this.detail(itemId, header);

    const existing = await this._prisma.inventory_stock_adjustments.findFirst({
      where: {
        id: adjustmentId,
        master_inventory_items_id: itemId,
        stores_id: store_id,
      },
      select: {
        id: true,
        action: true,
        adjustment_quantity: true,
        previous_quantity: true,
        new_quantity: true,
      },
    });
    if (!existing) throw new NotFoundException('Stock adjustment not found');

    // If fields that affect quantity changed, recalc item stock
    const needRecalc =
      dto.adjustmentQuantity !== undefined || dto.action !== undefined;

    const result = await this._prisma.$transaction(async (tx) => {
      let item = await tx.master_inventory_items.findUnique({
        where: { id: itemId },
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      // Update the adjustment record first
      const updatedAdj = await tx.inventory_stock_adjustments.update({
        where: { id: adjustmentId },
        data: {
          ...(dto.action !== undefined && { action: dto.action as any }),
          ...(dto.adjustmentQuantity !== undefined && {
            adjustment_quantity: dto.adjustmentQuantity,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          created_by: header.user?.id || null, // Track who updated the adjustment
          updated_at: new Date(),
        },
        select: {
          ...this.stockAdjustmentSafeSelect,
          created_at: true,
        },
      });

      if (needRecalc) {
        // Get all adjustments for this item in chronological order
        const allAdjustments = await tx.inventory_stock_adjustments.findMany({
          where: {
            master_inventory_items_id: itemId,
            stores_id: store_id,
          },
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            action: true,
            adjustment_quantity: true,
            previous_quantity: true,
            created_at: true,
          },
        });

        if (allAdjustments.length === 0) {
          throw new NotFoundException('No adjustments found');
        }

        // Get the original stock quantity before any adjustments
        const originalStockQuantity = allAdjustments[0].previous_quantity;
        let runningStockQuantity = originalStockQuantity;

        // Recalculate stock quantity by applying all adjustments in order
        for (const adj of allAdjustments) {
          const delta =
            adj.action === 'STOCK_IN'
              ? adj.adjustment_quantity
              : -adj.adjustment_quantity;
          runningStockQuantity += delta;

          if (runningStockQuantity < 0) {
            throw new BadRequestException(
              'Resulting stock quantity cannot be negative',
            );
          }

          // Update the new_quantity for each adjustment record
          await tx.inventory_stock_adjustments.update({
            where: { id: adj.id },
            data: { new_quantity: runningStockQuantity },
          });
        }

        // Update the item's final stock quantity
        item = await tx.master_inventory_items.update({
          where: { id: itemId },
          data: {
            stock_quantity: runningStockQuantity,
            updated_at: new Date(),
          },
        });
      }

      // Get the updated adjustment record with correct new_quantity
      const finalUpdatedAdj = await tx.inventory_stock_adjustments.findUnique({
        where: { id: adjustmentId },
        select: this.stockAdjustmentSafeSelect,
      });

      return { updatedAdj: finalUpdatedAdj, item };
    });

    return {
      item: this.toPlainItem(result.item),
      adjustment: result.updatedAdj,
    };
  }

  private async ensureNotDuplicateSku(
    sku: string,
    excludeId?: string,
    storeId?: string,
  ) {
    const where: any = { sku: { equals: sku, mode: 'insensitive' } };
    if (excludeId) where.id = { not: excludeId };
    if (storeId) {
      where.store_id = storeId;
    }
    const existing = await this._prisma.master_inventory_items.findFirst({
      where,
    });
    if (existing) {
      throw new BadRequestException(
        `Inventory item with SKU '${sku}' already exists in this store`,
      );
    }
  }

  private toPlainItem(item: any) {
    if (!item) return item;
    const price = item.price_per_unit;
    const priceGrosir = item.price_grosir;
    const priceNumber =
      price && typeof price === 'object' && typeof price.toNumber === 'function'
        ? price.toNumber()
        : price;
    const priceGrosirNumber =
      priceGrosir &&
      typeof priceGrosir === 'object' &&
      typeof priceGrosir.toNumber === 'function'
        ? priceGrosir.toNumber()
        : priceGrosir;
    const margin = item.margin;
    const marginNumber =
      margin &&
      typeof margin === 'object' &&
      typeof margin.toNumber === 'function'
        ? margin.toNumber()
        : margin;

    const markup = item.markup;
    const markupNumber =
      markup &&
      typeof markup === 'object' &&
      typeof markup.toNumber === 'function'
        ? markup.toNumber()
        : markup;
    return {
      ...item,
      price_per_unit: priceNumber,
      price_grosir: priceGrosirNumber,
      margin: marginNumber,
      markup: markupNumber,
    };
  }

  /**
   * Validate date format to ensure it follows yyyy-mm-dd format
   */
  private validateDateFormat(dateString: string): void {
    if (!dateString) return;

    // Check if the string matches exactly yyyy-mm-dd format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      throw new BadRequestException(
        'Expiry date must be in yyyy-mm-dd format (example: 2025-12-01)',
      );
    }

    // Check if it's a valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid expiry date. Please provide a valid date in yyyy-mm-dd format',
      );
    }

    // Ensure the parsed date matches the input string (to prevent dates like 2025-13-01)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    if (formattedDate !== dateString) {
      throw new BadRequestException(
        'Invalid expiry date. Please provide a valid date in yyyy-mm-dd format',
      );
    }
  }

  async deleteBatch(batchId: string): Promise<{ deletedCount: number }> {
    // Validate batch exists
    const batchExists = await this._prisma.temp_import_inventory_items.count({
      where: { batch_id: batchId },
    });

    if (batchExists === 0) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Delete all records with the given batch_id
    const deleteResult =
      await this._prisma.temp_import_inventory_items.deleteMany({
        where: { batch_id: batchId },
      });

    this.logger.log(
      `Deleted ${deleteResult.count} records for batch ${batchId}`,
    );

    return { deletedCount: deleteResult.count };
  }
}
