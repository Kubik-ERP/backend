import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { UpdateSupplierDto } from '../dtos/update-supplier.dto';
import { GetSuppliersDto } from '../dtos/get-suppliers.dto';
import { master_suppliers } from '@prisma/client';
import { GetItemSuppliesDto } from '../dtos';
import { toPlainItem } from '../../../common/helpers/object-transformer.helper';
import {
  ImportSuppliersPreviewResponseDto,
  ExecuteImportSuppliersResponseDto,
} from '../dtos';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly _prisma: PrismaService) {}

  /**
   * Generate supplier code based on supplier name
   * Rules:
   * - 2+ words: take first letter of first 2 words
   * - 1 word: take first 2 letters
   * - Add counter based on MAX existing code for the prefix
   */
  private async generateSupplierCode(
    supplierName: string,
    storeId: string,
  ): Promise<string> {
    try {
      // Generate prefix from supplier name
      const words = supplierName.trim().split(/\s+/);
      let prefix = '';

      if (words.length >= 2) {
        // 2+ words: take first letter of first 2 words
        prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
      } else {
        // 1 word: take first 2 letters
        prefix = words[0].substring(0, 2).toUpperCase();
      }

      // Find the highest existing code number for this prefix in the store
      const existingSuppliers = await this._prisma.master_suppliers.findMany({
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
      existingSuppliers.forEach((supplier) => {
        const numberPart = supplier.code.substring(prefix.length);
        const counter = parseInt(numberPart, 10);
        if (!isNaN(counter) && counter > maxCounter) {
          maxCounter = counter;
        }
      });

      // Generate new counter (max + 1) with leading zeros
      const newCounter = (maxCounter + 1).toString().padStart(4, '0');

      return `${prefix}${newCounter}`;
    } catch (error) {
      this.logger.error(`Failed to generate supplier code: ${error.message}`);
      throw new BadRequestException('Failed to generate supplier code');
    }
  }

  /**
   * Validate duplicate supplier code within a store
   */
  private async validateDuplicateSupplierCode(
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

    const existingSupplier = await this._prisma.master_suppliers.findFirst({
      where: whereCondition,
    });

    if (existingSupplier) {
      throw new BadRequestException(`Supplier code '${code}' already exists`);
    }
  }

  /**
   * @description Create a new supplier
   */
  public async createSupplier(
    createSupplierDto: CreateSupplierDto,
    header: ICustomRequestHeaders,
  ): Promise<master_suppliers> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Validate for duplicate supplier (same name + email + tax identification number) within the store
      await this.validateDuplicateSupplier(
        createSupplierDto.supplierName,
        createSupplierDto.taxIdentificationNumber,
        undefined,
        store_id,
        createSupplierDto.email,
      );

      // Validate contact person is not empty
      if (!createSupplierDto.contactPerson?.trim()) {
        throw new BadRequestException('Contact person is required');
      }

      // Generate code if not provided
      const supplierCode =
        createSupplierDto.code ||
        (await this.generateSupplierCode(
          createSupplierDto.supplierName,
          store_id,
        ));

      // Validate for duplicate code within the store
      await this.validateDuplicateSupplierCode(
        supplierCode,
        undefined,
        store_id,
      );

      const supplier = await this._prisma.master_suppliers.create({
        data: {
          supplier_name: createSupplierDto.supplierName,
          code: supplierCode,
          contact_person: createSupplierDto.contactPerson,
          phone_number: createSupplierDto.phoneNumber,
          email: createSupplierDto.email || null,
          address: createSupplierDto.address || null,
          bank_name: createSupplierDto.bankName || null,
          bank_account_number: createSupplierDto.bankAccountNumber || null,
          bank_account_name: createSupplierDto.bankAccountName || null,
          tax_identification_number:
            createSupplierDto.taxIdentificationNumber || null,
          store_id: store_id,
        },
      });

      this.logger.log(
        `Supplier created successfully: ${supplier.supplier_name} with code: ${supplier.code}`,
      );
      return supplier;
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.error(`Failed to create supplier: ${error.message}`);
        throw error;
      }
      this.logger.error(
        `Failed to create supplier: ${error?.message ?? error}` +
          (error?.stack ? `\nStack: ${error.stack}` : ''),
      );
      throw new BadRequestException('Failed to create supplier', {
        cause: new Error(),
        description: error?.message ?? 'Unknown error',
      });
    }
  }

  /**
   * @description Get item supplies list (inventory items tied to suppliers) with search, date filter, and ordering
   */
  public async getItemSupplies(
    supplierId: string,
    query: GetItemSuppliesDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const {
      page = 1,
      pageSize = 10,
      search,
      startDate,
      endDate,
      orderBy = 'order_date',
      orderDirection = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;
    const whereItem: any = {
      stores_has_master_inventory_items: {
        some: { stores_id: store_id },
      },
    };

    // Filter by supplier id
    if (supplierId) {
      whereItem.supplier_id = supplierId;
    }

    if (search) {
      whereItem.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Date filter on created_at of master_inventory_items
    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        // include end of day
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      whereItem.created_at = createdAt;
    }

    const orderByClause: any = {};
    const direction = orderDirection;
    switch (orderBy) {
      case 'sku':
        orderByClause.sku = direction;
        break;
      case 'price_per_unit':
        orderByClause.price_per_unit = direction;
        break;
      case 'expiry_date':
        orderByClause.expiry_date = direction;
        break;
      case 'order_date':
        orderByClause.created_at = direction;
        break;
      default:
        orderByClause.created_at = direction;
    }

    const total = await this._prisma.master_inventory_items.count({
      where: whereItem,
    });

    const items = await this._prisma.master_inventory_items.findMany({
      where: whereItem,
      select: {
        id: true,
        sku: true,
        name: true,
        master_inventory_categories: { select: { name: true } },
        master_brands: { select: { brand_name: true } },
        price_per_unit: true,
        expiry_date: true,
        created_at: true,
        purchase_order_items: {
          take: 1,
          orderBy: { purchase_orders: { order_date: 'asc' } },
          select: { purchase_orders: { select: { order_date: true } } },
        },
      },
      orderBy: orderByClause,
      skip,
      take: pageSize,
    });

    let mapped = items.map((it) => ({
      id: it.id,
      sku: it.sku,
      item_name: it.name,
      category: it.master_inventory_categories?.name ?? null,
      brand: it.master_brands?.brand_name ?? null,
      price_per_unit: it.price_per_unit,
      expiry_date: it.expiry_date,
      created_at: it.created_at,
    }));

    // If sorting by order_date was requested, sort in-memory by derived field
    if (orderBy === 'order_date') {
      mapped = mapped.sort((a, b) => {
        const aTime = a.created_at
          ? new Date(a.created_at as any).getTime()
          : 0;
        const bTime = b.created_at
          ? new Date(b.created_at as any).getTime()
          : 0;
        return orderDirection === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }

    const plainItems = mapped.map((i) => toPlainItem(i));

    return {
      items: plainItems,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * @description Get all suppliers with pagination and search for a specific store
   */
  public async getSuppliers(
    getSuppliersDto: GetSuppliersDto,
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
      } = getSuppliersDto;

      const skip = (page - 1) * pageSize;

      // Build where clause for search within the store
      const searchConditions: any = {
        store_id: store_id,
      };

      if (search) {
        searchConditions.OR = [
          {
            supplier_name: {
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
          {
            contact_person: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Get total count of suppliers in this store
      const total = await this._prisma.master_suppliers.count({
        where: searchConditions,
      });

      // Get paginated data
      const suppliers = await this._prisma.master_suppliers.findMany({
        where: searchConditions,
        skip,
        take: pageSize,
        orderBy: {
          [orderBy]: orderDirection,
        },
      });
      const totalPages = Math.ceil(total / pageSize);

      this.logger.log(
        `Retrieved ${suppliers.length} suppliers for store ${store_id}`,
      );

      return {
        items: suppliers,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get suppliers', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to get suppliers', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Get supplier by ID within a specific store
   */
  public async getSupplierById(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<master_suppliers> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      const supplier = await this._prisma.master_suppliers.findFirst({
        where: {
          id: id,
          store_id: store_id,
        },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${id} not found in this store`,
        );
      }

      this.logger.log(
        `Retrieved supplier with ID: ${id} from store: ${store_id}`,
      );
      return supplier;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to get supplier with ID: ${id}`, error);
      throw new BadRequestException('Failed to get supplier', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Update supplier by ID within a specific store
   */
  public async updateSupplier(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    header: ICustomRequestHeaders,
  ): Promise<master_suppliers> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if supplier exists in this store
      const existingSupplier = await this.getSupplierById(id, header);

      // Validate for duplicate supplier if name, email, or tax ID is being updated
      if (
        updateSupplierDto.supplierName ||
        updateSupplierDto.email !== undefined ||
        updateSupplierDto.taxIdentificationNumber !== undefined
      ) {
        const taxId =
          updateSupplierDto.taxIdentificationNumber === undefined
            ? existingSupplier.tax_identification_number || undefined
            : updateSupplierDto.taxIdentificationNumber;

        const email =
          updateSupplierDto.email === undefined
            ? existingSupplier.email || undefined
            : updateSupplierDto.email;

        await this.validateDuplicateSupplier(
          updateSupplierDto.supplierName || existingSupplier.supplier_name,
          taxId,
          id,
          store_id,
          email,
        );
      }

      // Validate contact person is not empty if being updated
      if (
        updateSupplierDto.contactPerson !== undefined &&
        !updateSupplierDto.contactPerson?.trim()
      ) {
        throw new BadRequestException('Contact person cannot be empty');
      }

      // Validate for duplicate supplier code if it's being updated
      if (
        updateSupplierDto.code &&
        updateSupplierDto.code !== existingSupplier.code
      ) {
        await this.validateDuplicateSupplierCode(
          updateSupplierDto.code,
          id,
          store_id,
        );
      }

      const updateData: any = {};

      if (updateSupplierDto.supplierName !== undefined) {
        updateData.supplier_name = updateSupplierDto.supplierName;
      }
      if (updateSupplierDto.code !== undefined) {
        updateData.code = updateSupplierDto.code;
      }
      if (updateSupplierDto.contactPerson !== undefined) {
        updateData.contact_person = updateSupplierDto.contactPerson;
      }
      if (updateSupplierDto.phoneNumber !== undefined) {
        updateData.phone_number = updateSupplierDto.phoneNumber;
      }
      if (updateSupplierDto.email !== undefined) {
        updateData.email = updateSupplierDto.email;
      }
      if (updateSupplierDto.address !== undefined) {
        updateData.address = updateSupplierDto.address;
      }
      if (updateSupplierDto.bankName !== undefined) {
        updateData.bank_name = updateSupplierDto.bankName;
      }
      if (updateSupplierDto.bankAccountNumber !== undefined) {
        updateData.bank_account_number = updateSupplierDto.bankAccountNumber;
      }
      if (updateSupplierDto.bankAccountName !== undefined) {
        updateData.bank_account_name = updateSupplierDto.bankAccountName;
      }
      if (updateSupplierDto.taxIdentificationNumber !== undefined) {
        updateData.tax_identification_number =
          updateSupplierDto.taxIdentificationNumber;
      }

      const updatedSupplier = await this._prisma.master_suppliers.update({
        where: { id },
        data: {
          ...updateData,
          updated_at: new Date(),
        },
      });

      this.logger.log(`Supplier updated successfully with ID: ${id}`);
      return updatedSupplier;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update supplier with ID: ${id}`, error);
      throw new BadRequestException('Failed to update supplier', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Delete supplier by ID from a specific store
   */
  public async deleteSupplier(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    try {
      const store_id = header.store_id;

      if (!store_id) {
        throw new BadRequestException('store_id is required');
      }

      // Check if supplier exists in this store
      await this.getSupplierById(id, header);

      // Prevent delete if supplier is linked to any inventory item in this store
      const linkedItemsCount = await this._prisma.master_inventory_items.count({
        where: {
          supplier_id: id,
          stores_has_master_inventory_items: { some: { stores_id: store_id } },
        },
      });
      if (linkedItemsCount > 0) {
        throw new BadRequestException(
          'This supplier is linked to existing inventory items. Please remove or reassign the linked items before attemping to delete',
        );
      }

      // Delete supplier directly
      await this._prisma.master_suppliers.delete({
        where: {
          id: id,
          store_id: store_id,
        },
      });

      this.logger.log(
        `Supplier deleted successfully with ID: ${id} from store: ${store_id}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete supplier with ID: ${id}`, error);
      throw new BadRequestException('Failed to delete supplier', {
        cause: new Error(),
        description: error.message,
      });
    }
  }

  /**
   * @description Validate duplicate supplier by name, email, and tax identification number within a store
   */
  private async validateDuplicateSupplier(
    supplierName: string,
    taxIdentificationNumber?: string,
    excludeId?: string,
    storeId?: string,
    email?: string,
  ): Promise<void> {
    const whereConditions: any[] = [];

    // Check for duplicate supplier name
    whereConditions.push({
      supplier_name: {
        equals: supplierName,
        mode: 'insensitive',
      },
    });

    // If tax identification number is provided, check for duplicate NPWP
    if (taxIdentificationNumber?.trim()) {
      whereConditions.push({
        tax_identification_number: taxIdentificationNumber,
      });
    }

    // If email is provided, check for duplicate email
    if (email?.trim()) {
      whereConditions.push({
        email: {
          equals: email,
          mode: 'insensitive',
        },
      });
    }

    // Query suppliers within the same store
    const suppliers = await this._prisma.master_suppliers.findMany({
      where: {
        store_id: storeId,
        OR: whereConditions,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (suppliers.length > 0) {
      const existingSupplier = suppliers[0];

      if (
        existingSupplier &&
        existingSupplier.supplier_name.toLowerCase() ===
          supplierName.toLowerCase()
      ) {
        throw new BadRequestException(
          `Supplier with name "${supplierName}" already exists in this store`,
        );
      }

      if (
        email &&
        existingSupplier &&
        existingSupplier.email?.toLowerCase() === email.toLowerCase()
      ) {
        throw new BadRequestException(
          `Supplier with email ${email} already exists in this store`,
        );
      }

      if (
        taxIdentificationNumber &&
        existingSupplier &&
        existingSupplier.tax_identification_number === taxIdentificationNumber
      ) {
        throw new BadRequestException(
          `Supplier with tax identification number "${taxIdentificationNumber}" already exists in this store`,
        );
      }
    }
  }

  /**
   * Generate supplier import template Excel file
   */
  public async generateImportTemplate(
    header: ICustomRequestHeaders,
  ): Promise<Buffer> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Suppliers
    const sheet = workbook.addWorksheet('Suppliers');
    const columns = [
      { header: 'Supplier Name', key: 'supplier_name', width: 30 },
      { header: 'Contact Person', key: 'contact_person', width: 25 },
      { header: 'Phone Number', key: 'phone_number', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Supplier Code', key: 'supplier_code', width: 20 },
      { header: 'Bank Name', key: 'bank_name', width: 25 },
      { header: 'Bank Account Number', key: 'bank_account_number', width: 25 },
      { header: 'Bank Account Name', key: 'bank_account_name', width: 25 },
      { header: 'NPWP', key: 'npwp', width: 25 },
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

    // Apply background color to all columns with data (A to J = 10 columns)
    for (let col = 1; col <= 10; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add title row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT SUPPLIERS']);
    sheet.mergeCells('A1:J1'); // Merge across 10 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add required label row
    sheet.insertRow(2, [
      'The label (*) is required to be filled. Supplier Code is optional - if empty, it will be auto-generated.',
    ]);
    sheet.mergeCells('A2:J2'); // Merge across 10 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };
    sheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Mark required columns in header (Supplier Name, Contact Person, Phone Number)
    const requiredCols = [1, 2, 3]; // Supplier Name, Contact Person, Phone Number
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Add sample row at row 4
    const sampleRow = sheet.getRow(4);
    sampleRow.getCell(1).value = 'PT Supplier Contoh'; // Supplier Name
    sampleRow.getCell(2).value = 'John Doe'; // Contact Person
    sampleRow.getCell(3).value = '08123456789'; // Phone Number
    sampleRow.getCell(4).value = 'supplier@example.com'; // Email
    sampleRow.getCell(5).value = 'Jl. Contoh No. 123, Jakarta'; // Address
    sampleRow.getCell(6).value = 'SU0001'; // Supplier Code
    sampleRow.getCell(7).value = 'Bank Central Asia'; // Bank Name
    sampleRow.getCell(8).value = '1234567890'; // Bank Account Number
    sampleRow.getCell(9).value = 'PT Supplier Contoh'; // Bank Account Name
    sampleRow.getCell(10).value = '123456789012345'; // NPWP

    // Set explicit format for email column to be text (not hyperlink)
    sampleRow.getCell(4).numFmt = '@'; // Text format

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
  ): Promise<ImportSuppliersPreviewResponseDto> {
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
        await this._prisma.temp_import_suppliers.deleteMany({
          where: { batch_id: existingBatchId },
        });
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

    const worksheet = workbook.getWorksheet('Suppliers');
    if (!worksheet) {
      throw new BadRequestException(
        'Worksheet "Suppliers" not found in the Excel file',
      );
    }

    // Extract data starting from row 4 (after title, description, and headers)
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
            supplier_name: this.getCellValue(row.getCell(1)),
            contact_person: this.getCellValue(row.getCell(2)),
            phone_number: this.getCellValue(row.getCell(3)),
            email: this.getCellValue(row.getCell(4)),
            address: this.getCellValue(row.getCell(5)),
            supplier_code: this.getCellValue(row.getCell(6)),
            bank_name: this.getCellValue(row.getCell(7)),
            bank_account_number: this.getCellValue(row.getCell(8)),
            bank_account_name: this.getCellValue(row.getCell(9)),
            npwp: this.getCellValue(row.getCell(10)),
          };

          // Debug logging for email field
          this.logger.debug(
            `Row ${currentRowNumber} - Email cell value: ${JSON.stringify(row.getCell(4).value)}, parsed: ${rowData.email}`,
          );

          rows.push(rowData);
          currentRowNumber += 1;
        }
      }
    });

    if (rows.length === 0) {
      throw new BadRequestException(
        'No data found in the Excel file. Please ensure data starts from row 4.',
      );
    }

    // Check for duplicates within the batch
    const supplierNameCountMap = new Map<string, number>();
    const emailCountMap = new Map<string, number>();
    const npwpCountMap = new Map<string, number>();
    const supplierCodeCountMap = new Map<string, number>();
    const supplierNameRowMap = new Map<string, number[]>();
    const emailRowMap = new Map<string, number[]>();
    const npwpRowMap = new Map<string, number[]>();
    const supplierCodeRowMap = new Map<string, number[]>();

    rows.forEach((row) => {
      if (row.supplier_name?.trim()) {
        const name = row.supplier_name.trim().toLowerCase();
        supplierNameCountMap.set(
          name,
          (supplierNameCountMap.get(name) || 0) + 1,
        );
        if (!supplierNameRowMap.has(name)) supplierNameRowMap.set(name, []);
        supplierNameRowMap.get(name)?.push(row.row_number);
      }

      if (row.email?.trim()) {
        const email = row.email.trim().toLowerCase();
        emailCountMap.set(email, (emailCountMap.get(email) || 0) + 1);
        if (!emailRowMap.has(email)) emailRowMap.set(email, []);
        emailRowMap.get(email)?.push(row.row_number);
      }

      if (row.npwp?.trim()) {
        const npwp = row.npwp.trim();
        npwpCountMap.set(npwp, (npwpCountMap.get(npwp) || 0) + 1);
        if (!npwpRowMap.has(npwp)) npwpRowMap.set(npwp, []);
        npwpRowMap.get(npwp)?.push(row.row_number);
      }

      if (row.supplier_code?.trim()) {
        const code = row.supplier_code.trim().toLowerCase();
        supplierCodeCountMap.set(
          code,
          (supplierCodeCountMap.get(code) || 0) + 1,
        );
        if (!supplierCodeRowMap.has(code)) supplierCodeRowMap.set(code, []);
        supplierCodeRowMap.get(code)?.push(row.row_number);
      }
    });

    // Process and validate each row
    const processedData = await Promise.all(
      rows.map(async (rowData) => {
        const errors: string[] = [];
        const processedRow = { ...rowData };

        // Required field validations
        if (processedRow.supplier_name?.trim()) {
          // Check for duplicate in current batch
          const name = processedRow.supplier_name.trim().toLowerCase();
          if (supplierNameCountMap.get(name)! > 1) {
            const duplicateRows = supplierNameRowMap.get(name) || [];
            errors.push(
              `Supplier Name '${processedRow.supplier_name}' is duplicated in rows: ${duplicateRows.join(', ')}`,
            );
          }

          // Check for duplicate in database
          try {
            await this.validateDuplicateSupplier(
              processedRow.supplier_name.trim(),
              processedRow.npwp?.trim() || undefined,
              undefined,
              store_id,
              processedRow.email?.trim() || undefined,
            );
          } catch (error) {
            errors.push(error.message);
          }
        } else {
          errors.push('Supplier Name is required');
        }

        if (!processedRow.contact_person?.trim()) {
          errors.push('Contact Person is required');
        }

        if (!processedRow.phone_number?.trim()) {
          errors.push('Phone Number is required');
        } else if (processedRow.phone_number.length > 20) {
          errors.push('Phone Number should not exceed 20 characters');
        }

        // Email validation if provided
        if (processedRow.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(processedRow.email)) {
            // Check for duplicate in current batch
            const email = processedRow.email.trim().toLowerCase();
            if (emailCountMap.get(email)! > 1) {
              const duplicateRows = emailRowMap.get(email) || [];
              errors.push(
                `Email '${processedRow.email}' is duplicated in rows: ${duplicateRows.join(', ')}`,
              );
            }
          } else {
            errors.push('Invalid email format');
          }
        }

        // NPWP validation if provided
        if (processedRow.npwp?.trim()) {
          if (processedRow.npwp.length > 50) {
            errors.push('NPWP should not exceed 50 characters');
          } else {
            // Check for duplicate in current batch
            const npwp = processedRow.npwp.trim();
            if (npwpCountMap.get(npwp)! > 1) {
              const duplicateRows = npwpRowMap.get(npwp) || [];
              errors.push(
                `NPWP '${processedRow.npwp}' is duplicated in rows: ${duplicateRows.join(', ')}`,
              );
            }
          }
        }

        // Field length validations
        if (
          processedRow.bank_account_number &&
          processedRow.bank_account_number.length > 50
        ) {
          errors.push('Bank Account Number should not exceed 50 characters');
        }

        // Generate supplier code if not provided
        let supplierCode = processedRow.supplier_code?.trim();
        if (!supplierCode && processedRow.supplier_name?.trim()) {
          try {
            supplierCode = await this.generateSupplierCode(
              processedRow.supplier_name.trim(),
              store_id,
            );
            processedRow.supplier_code = supplierCode;
          } catch (error) {
            errors.push(`Failed to generate supplier code: ${error.message}`);
          }
        }

        // Validate supplier code if provided
        if (supplierCode) {
          // Check for duplicate in current batch
          const code = supplierCode.trim().toLowerCase();
          if (supplierCodeCountMap.get(code)! > 1) {
            const duplicateRows = supplierCodeRowMap.get(code) || [];
            errors.push(
              `Supplier Code '${supplierCode}' is duplicated in rows: ${duplicateRows.join(', ')}`,
            );
          }

          // Check for duplicate in database
          try {
            await this.validateDuplicateSupplierCode(
              supplierCode,
              undefined,
              store_id,
            );
          } catch (error) {
            errors.push(error.message);
          }
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

    // Save to temporary table using Prisma
    const tempData = processedData.map((row) => ({
      batch_id: batchId,
      row_number: row.row_number,
      status: row.status,
      supplier_name: row.supplier_name || '',
      contact_person: row.contact_person || '',
      phone_number: row.phone_number || '',
      email: row.email || null,
      address: row.address || null,
      supplier_code: row.supplier_code || '',
      bank_name: row.bank_name || null,
      bank_account_number: row.bank_account_number || null,
      bank_account_name: row.bank_account_name || null,
      npwp: row.npwp || null,
      error_messages: row.error_messages || null,
    }));

    try {
      await this._prisma.temp_import_suppliers.createMany({
        data: tempData,
      });
      this.logger.log(
        `Saved ${tempData.length} rows to temp table with batch ID: ${batchId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error saving to temp table: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to save preview data. Please try again.',
      );
    }

    // Separate valid and invalid data
    const validData = processedData.filter((row) => row.status === 'valid');
    const invalidData = processedData.filter((row) => row.status === 'invalid');

    const response: ImportSuppliersPreviewResponseDto = {
      batch_id: batchId,
      total_rows: processedData.length,
      valid_rows: validData.length,
      invalid_rows: invalidData.length,
      success_data: validData.map((row) => ({
        id: row.batch_id, // Using batch_id as temporary id
        row_number: row.row_number,
        supplier_name: row.supplier_name,
        contact_person: row.contact_person,
        phone_number: row.phone_number,
        email: row.email,
        address: row.address,
        supplier_code: row.supplier_code,
        bank_name: row.bank_name,
        bank_account_number: row.bank_account_number,
        bank_account_name: row.bank_account_name,
        npwp: row.npwp,
      })),
      failed_data: invalidData.map((row) => ({
        id: row.batch_id, // Using batch_id as temporary id
        row_number: row.row_number,
        supplier_name: row.supplier_name,
        contact_person: row.contact_person,
        phone_number: row.phone_number,
        email: row.email,
        address: row.address,
        supplier_code: row.supplier_code,
        bank_name: row.bank_name,
        bank_account_number: row.bank_account_number,
        bank_account_name: row.bank_account_name,
        npwp: row.npwp,
        error_messages: row.error_messages
          ? row.error_messages.split('; ')
          : [],
      })),
      summary: {
        message: `Processed ${processedData.length} rows: ${validData.length} valid, ${invalidData.length} invalid`,
        hasErrors: invalidData.length > 0,
        readyToImport: validData.length > 0 && invalidData.length === 0,
      },
    };

    return response;
  }

  /**
   * Execute import of suppliers from temp table
   */
  public async executeImport(
    batchId: string,
    header: ICustomRequestHeaders,
  ): Promise<ExecuteImportSuppliersResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Get data from temp table
    const tempData = await this._prisma.temp_import_suppliers.findMany({
      where: {
        batch_id: batchId,
        status: 'valid',
      },
      orderBy: { row_number: 'asc' },
    });

    if (tempData.length === 0) {
      throw new BadRequestException(
        'No data found for the provided batch ID. Please run preview import first.',
      );
    }

    const results = {
      totalProcessed: tempData.length,
      successCount: 0,
      failureCount: 0,
      failedSuppliers: [] as Array<{
        rowNumber: number;
        supplierName: string;
        supplierCode: string;
        errorMessage: string;
      }>,
    };

    // Process each supplier
    for (const tempSupplier of tempData) {
      try {
        // Create the supplier
        const supplier = await this._prisma.master_suppliers.create({
          data: {
            supplier_name: tempSupplier.supplier_name,
            code: tempSupplier.supplier_code || undefined,
            contact_person: tempSupplier.contact_person || '',
            phone_number: tempSupplier.phone_number || '',
            email: tempSupplier.email,
            address: tempSupplier.address,
            bank_name: tempSupplier.bank_name,
            bank_account_number: tempSupplier.bank_account_number,
            bank_account_name: tempSupplier.bank_account_name,
            tax_identification_number: tempSupplier.npwp,
            store_id: store_id,
          },
        });

        results.successCount += 1;
        this.logger.log(
          `Successfully imported supplier: ${supplier.supplier_name} with code: ${supplier.code}`,
        );
      } catch (error) {
        results.failureCount += 1;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        results.failedSuppliers.push({
          rowNumber: tempSupplier.row_number,
          supplierName: tempSupplier.supplier_name,
          supplierCode: tempSupplier.supplier_code || '',
          errorMessage,
        });

        this.logger.error(
          `Failed to import supplier ${tempSupplier.supplier_name}: ${errorMessage}`,
        );
      }
    }

    // Clean up temp data after processing
    try {
      await this._prisma.temp_import_suppliers.deleteMany({
        where: { batch_id: batchId },
      });
      this.logger.log(`Cleaned up temp data for batch: ${batchId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to clean up temp data for batch ${batchId}: ${error.message}`,
      );
    }

    this.logger.log(
      `Import completed: ${results.successCount} success, ${results.failureCount} failed`,
    );

    return results;
  }

  /**
   * Delete import batch from temp table
   */
  public async deleteBatch(batchId: string): Promise<{ deletedCount: number }> {
    try {
      const result = await this._prisma.temp_import_suppliers.deleteMany({
        where: { batch_id: batchId },
      });

      this.logger.log(`Deleted ${result.count} records for batch: ${batchId}`);

      return { deletedCount: result.count };
    } catch (error) {
      this.logger.error(
        `Error deleting batch ${batchId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to delete batch. Please try again.',
      );
    }
  }

  /**
   * Helper method to get cell value from Excel
   */
  private getCellValue(cell: ExcelJS.Cell): string {
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle different cell value types
    if (typeof cell.value === 'string') {
      return cell.value.trim();
    }

    if (typeof cell.value === 'number') {
      return String(cell.value).trim();
    }

    // Handle hyperlink objects (email might be parsed as hyperlink)
    if (typeof cell.value === 'object' && cell.value !== null) {
      // Check if it's a hyperlink object
      if ('text' in cell.value && typeof cell.value.text === 'string') {
        return cell.value.text.trim();
      }

      // Check if it's a rich text object
      if ('richText' in cell.value && Array.isArray(cell.value.richText)) {
        return cell.value.richText
          .map((rt: any) => rt.text || '')
          .join('')
          .trim();
      }

      // Check if it has a hyperlink property
      if (
        'hyperlink' in cell.value &&
        typeof cell.value.hyperlink === 'string'
      ) {
        return cell.value.hyperlink.trim();
      }

      // If it's some other object, try to convert to string
      return String(cell.value).trim();
    }

    return String(cell.value).trim();
  }
}
