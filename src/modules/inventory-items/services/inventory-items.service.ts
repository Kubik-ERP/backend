import * as ExcelJS from 'exceljs';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateInventoryItemDto,
  GetInventoryItemsDto,
  UpdateInventoryItemDto,
} from '../dtos';
import {
  CreateStockAdjustmentDto,
  GetStockAdjustmentsDto,
  StockAdjustmentActionDto,
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

    // Fetch master data filtered by store
    const [brands, categories, storageLocations, suppliers] = await Promise.all(
      [
        this._prisma.master_brands.findMany({
          where: {
            stores_has_master_brands: { some: { stores_id: store_id } },
          },
          select: { id: true, brand_name: true },
        }),
        this._prisma.master_inventory_categories.findMany({
          where: {
            stores_has_master_inventory_categories: {
              some: { stores_id: store_id },
            },
          },
          select: { id: true, name: true },
        }),
        this._prisma.master_storage_locations.findMany({
          where: {
            stores_has_master_storage_locations: {
              some: { stores_id: store_id },
            },
          },
          select: { id: true, name: true },
        }),
        this._prisma.master_suppliers.findMany({
          where: {
            stores_has_master_suppliers: { some: { stores_id: store_id } },
          },
          select: { id: true, supplier_name: true },
        }),
      ],
    );

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Inventory Items
    const sheet = workbook.addWorksheet('Inventory Items');
    const columns = [
      { header: 'Item Name', key: 'item_name', width: 30 },
      { header: 'Brand', key: 'brand', width: 25 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Stock Quantity', key: 'stock_quantity', width: 18 },
      {
        header: 'Minimum Stock Quantity',
        key: 'minimum_stock_quantity',
        width: 22,
      },
      { header: 'Reorder Level', key: 'reorder_level', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 18 },
      { header: 'Storage Location', key: 'storage_location', width: 25 },
      { header: 'Price Per Unit', key: 'price_per_unit', width: 18 },
      { header: 'Supplier', key: 'supplier', width: 25 },
    ];
    sheet.columns = columns;

    // Add dropdowns for master data columns with proper validation
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

    // Sheet 2: Brand Reference
    const brandSheet = workbook.addWorksheet('Brand Reference');
    brandSheet.columns = [
      { header: 'ID | Brand Name', key: 'id_name', width: 40 },
    ];
    brands.forEach((b) =>
      brandSheet.addRow({
        id_name: `${b.id} | ${b.brand_name}`,
      }),
    );
    addDropdown(2, 'Brand Reference', 'A', brands.length); // Brand moved to column 2, reference column A

    // Sheet 3: Category Reference
    const catSheet = workbook.addWorksheet('Category Reference');
    catSheet.columns = [
      { header: 'ID | Category Name', key: 'id_name', width: 40 },
    ];
    categories.forEach((c) =>
      catSheet.addRow({
        id_name: `${c.id} | ${c.name}`,
      }),
    );
    addDropdown(5, 'Category Reference', 'A', categories.length); // Category moved to column 5, reference column A

    // Sheet 4: Storage Location Reference
    const storageSheet = workbook.addWorksheet('Storage Location Reference');
    storageSheet.columns = [
      { header: 'ID | Storage Location Name', key: 'id_name', width: 45 },
    ];
    storageLocations.forEach((s) =>
      storageSheet.addRow({
        id_name: `${s.id} | ${s.name}`,
      }),
    );
    addDropdown(12, 'Storage Location Reference', 'A', storageLocations.length); // Storage Location moved to column 12, reference column A

    // Sheet 5: Supplier Reference
    const supplierSheet = workbook.addWorksheet('Supplier Reference');
    supplierSheet.columns = [
      { header: 'ID | Supplier Name', key: 'id_name', width: 40 },
    ];
    suppliers.forEach((s) =>
      supplierSheet.addRow({
        id_name: `${s.id} | ${s.supplier_name}`,
      }),
    );
    addDropdown(14, 'Supplier Reference', 'A', suppliers.length); // Supplier moved to column 14, reference column A

    // Style header row (only for columns with data)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // Apply background color only to columns with data (A to N = 14 columns)
    for (let col = 1; col <= 14; col++) {
      headerRow.getCell(col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB6FFB6' },
      };
    }

    // Add notes row
    sheet.insertRow(1, ['TEMPLATE FOR IMPORT INVENTORY ITEMS']);
    sheet.mergeCells('A1:N1'); // Updated to N1 for 14 columns
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFF0000' } };

    // Add required label row
    sheet.insertRow(2, ['The label (*) is required to be filled']);
    sheet.mergeCells('A2:N2'); // Updated to N2 for 14 columns
    sheet.getRow(2).font = { italic: true, color: { argb: 'FFFF6600' } };

    // Mark required columns in header - updated column positions (without Store ID)
    const requiredCols = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]; // Item Name, Brand, SKU, Category, Unit, Stock Qty, Min Stock, Reorder, Storage, Price, Supplier
    requiredCols.forEach((col) => {
      const cell = sheet.getRow(3).getCell(col);
      cell.value = `${cell.value}(*)`;
      cell.font = { ...cell.font, color: { argb: 'FF008000' } };
    });

    // Prepare sample data using first item from each reference
    const sampleBrand =
      brands.length > 0 ? `${brands[0].id} | ${brands[0].brand_name}` : '';
    const sampleCategory =
      categories.length > 0
        ? `${categories[0].id} | ${categories[0].name}`
        : '';
    const sampleStorage =
      storageLocations.length > 0
        ? `${storageLocations[0].id} | ${storageLocations[0].name}`
        : '';
    const sampleSupplier =
      suppliers.length > 0
        ? `${suppliers[0].id} | ${suppliers[0].supplier_name}`
        : '';

    // Add sample row at row 4 using insertRow to ensure it stays at position 4
    sheet.insertRow(4, [
      'Sample Item Name', // Item Name
      sampleBrand, // Brand - use first brand from reference
      'SAMPLE123', // Barcode
      'SKU001', // SKU
      sampleCategory, // Category - use first category from reference
      'pcs', // Unit
      'Sample notes', // Notes
      100, // Stock Quantity
      10, // Minimum Stock Quantity
      20, // Reorder Level
      '2025-12-30', // Expiry Date
      sampleStorage, // Storage Location - use first storage from reference
      15000, // Price Per Unit
      sampleSupplier, // Supplier - use first supplier from reference
    ]);

    // Return as buffer
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
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
  } as const;

  constructor(private readonly _prisma: PrismaService) {}

  public async create(
    dto: CreateInventoryItemDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicateSku(dto.sku, undefined, store_id);

    const item = await this._prisma.master_inventory_items.create({
      data: {
        name: dto.name,
        brand_id: dto.brandId,
        barcode: dto.barcode,
        sku: dto.sku,
        category_id: dto.categoryId,
        unit: dto.unit,
        notes: dto.notes,
        stock_quantity: dto.stockQuantity,
        reorder_level: dto.reorderLevel,
        minimum_stock_quantity: dto.minimumStockQuantity,
        expiry_date: dto.expiryDate ? new Date(dto.expiryDate) : null,
        storage_location_id: dto.storageLocationId,
        price_per_unit: dto.pricePerUnit,
        supplier_id: dto.supplierId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this._prisma.stores_has_master_inventory_items.create({
      data: {
        stores_id: store_id,
        master_inventory_items_id: item.id,
      },
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
      stores_has_master_inventory_items: {
        some: { stores_id: store_id },
      },
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
          expiry_date: true,
          master_suppliers: { select: { id: true, supplier_name: true } },
          master_storage_locations: { select: { id: true, name: true } },
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
      expiry_date: it.expiry_date,
      supplier: it.master_suppliers?.supplier_name ?? null,
      storage_location: it.master_storage_locations?.name ?? null,
      category_id: it.master_inventory_categories?.id ?? null,
      brand_id: it.master_brands?.id ?? null,
      supplier_id: it.master_suppliers?.id ?? null,
      storage_location_id: it.master_storage_locations?.id ?? null,
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
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true,
        master_inventory_categories: { select: { name: true } },
        master_storage_locations: { select: { name: true } },
        unit: true,
        stock_quantity: true,
        reorder_level: true,
        minimum_stock_quantity: true,
        expiry_date: true,
        price_per_unit: true,
        master_brands: { select: { brand_name: true } },
        master_suppliers: { select: { supplier_name: true } },
        created_at: true,
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
      created_at: item.created_at,
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

    const updated = await this._prisma.master_inventory_items.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.brandId !== undefined && { brand_id: dto.brandId }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.categoryId !== undefined && { category_id: dto.categoryId }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.stockQuantity !== undefined && {
          stock_quantity: dto.stockQuantity,
        }),
        ...(dto.reorderLevel !== undefined && {
          reorder_level: dto.reorderLevel,
        }),
        ...(dto.minimumStockQuantity !== undefined && {
          minimum_stock_quantity: dto.minimumStockQuantity,
        }),
        ...(dto.expiryDate !== undefined && {
          expiry_date: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.storageLocationId !== undefined && {
          storage_location_id: dto.storageLocationId,
        }),
        ...(dto.pricePerUnit !== undefined && {
          price_per_unit: dto.pricePerUnit,
        }),
        ...(dto.supplierId !== undefined && { supplier_id: dto.supplierId }),
        updated_at: new Date(),
      },
    });
    this.logger.log(`Inventory item updated: ${updated.name}`);
    return this.toPlainItem(updated);
  }

  public async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const existing = await this.detail(id, header);

    await this._prisma.stores_has_master_inventory_items.deleteMany({
      where: { stores_id: store_id, master_inventory_items_id: id },
    });

    const other = await this._prisma.stores_has_master_inventory_items.count({
      where: { master_inventory_items_id: id },
    });

    if (other === 0) {
      await this._prisma.master_inventory_items.delete({ where: { id } });
    }
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
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
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
      expiryDate: item.expiry_date,
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
        stores_has_master_inventory_items: { some: { stores_id: store_id } },
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

    // If fields that affect quantity changed, recalc item stock: revert previous delta then apply new delta
    const needRecalc =
      dto.adjustmentQuantity !== undefined || dto.action !== undefined;

    const result = await this._prisma.$transaction(async (tx) => {
      let item = await tx.master_inventory_items.findUnique({
        where: { id: itemId },
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      if (needRecalc) {
        const prevDelta =
          existing.action === 'STOCK_IN'
            ? existing.adjustment_quantity
            : -existing.adjustment_quantity;
        let recalculated = item.stock_quantity - prevDelta; // revert
        const nextAction = dto.action ?? (existing.action as any);
        const nextQty = dto.adjustmentQuantity ?? existing.adjustment_quantity;
        const nextDelta = nextAction === 'STOCK_IN' ? nextQty : -nextQty;
        recalculated = recalculated + nextDelta;
        if (recalculated < 0)
          throw new BadRequestException(
            'Resulting stock quantity cannot be negative',
          );
        item = await tx.master_inventory_items.update({
          where: { id: itemId },
          data: { stock_quantity: recalculated, updated_at: new Date() },
        });
      }

      const updatedAdj = await tx.inventory_stock_adjustments.update({
        where: { id: adjustmentId },
        data: {
          ...(dto.action !== undefined && { action: dto.action as any }),
          ...(dto.adjustmentQuantity !== undefined && {
            adjustment_quantity: dto.adjustmentQuantity,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          previous_quantity: needRecalc
            ? existing.previous_quantity
            : existing.previous_quantity,
          new_quantity: needRecalc
            ? item.stock_quantity
            : existing.new_quantity,
          updated_at: new Date(),
        },
        select: this.stockAdjustmentSafeSelect,
      });

      return { updatedAdj, item };
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
      where.stores_has_master_inventory_items = {
        some: { stores_id: storeId },
      };
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
    const priceNumber =
      price && typeof price === 'object' && typeof price.toNumber === 'function'
        ? price.toNumber()
        : price;
    return { ...item, price_per_unit: priceNumber };
  }
}
