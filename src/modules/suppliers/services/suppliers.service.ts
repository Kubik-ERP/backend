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

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly _prisma: PrismaService) {}

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

      // Validate for duplicate supplier (same name + tax identification number) within the store
      await this.validateDuplicateSupplier(
        createSupplierDto.supplierName,
        createSupplierDto.taxIdentificationNumber,
        undefined,
        store_id,
      );

      // Validate contact person is not empty
      if (!createSupplierDto.contactPerson?.trim()) {
        throw new BadRequestException('Contact person is required');
      }

      const supplier = await this._prisma.master_suppliers.create({
        data: {
          supplier_name: createSupplierDto.supplierName,
          contact_person: createSupplierDto.contactPerson,
          phone_number: createSupplierDto.phoneNumber,
          email: createSupplierDto.email || null,
          address: createSupplierDto.address || null,
          bank_name: createSupplierDto.bankName || null,
          bank_account_number: createSupplierDto.bankAccountNumber || null,
          bank_account_name: createSupplierDto.bankAccountName || null,
          tax_identification_number:
            createSupplierDto.taxIdentificationNumber || null,
        },
      });

      // Create relation with store
      await this._prisma.stores_has_master_suppliers.create({
        data: {
          stores_id: store_id,
          master_suppliers_id: supplier.id,
        },
      });

      this.logger.log(`Supplier created successfully with ID: ${supplier.id}`);
      return supplier;
    } catch (error) {
      this.logger.error('Failed to create supplier', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create supplier', {
        cause: new Error(),
        description: error.message,
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
      const searchConditions: any = {};
      if (search) {
        searchConditions.OR = [
          {
            supplier_name: {
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
      const total = await this._prisma.stores_has_master_suppliers.count({
        where: {
          stores_id: store_id,
          master_suppliers: searchConditions,
        },
      });

      // Get paginated data
      const storeSuppliers =
        await this._prisma.stores_has_master_suppliers.findMany({
          where: {
            stores_id: store_id,
            master_suppliers: searchConditions,
          },
          include: {
            master_suppliers: true,
          },
          skip,
          take: pageSize,
          orderBy: {
            master_suppliers: {
              [orderBy]: orderDirection,
            },
          },
        });

      const suppliers = storeSuppliers.map((item) => item.master_suppliers);
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

      const storeSupplier =
        await this._prisma.stores_has_master_suppliers.findFirst({
          where: {
            stores_id: store_id,
            master_suppliers_id: id,
          },
          include: {
            master_suppliers: true,
          },
        });

      if (!storeSupplier || !storeSupplier.master_suppliers) {
        throw new NotFoundException(
          `Supplier with ID ${id} not found in this store`,
        );
      }

      this.logger.log(
        `Retrieved supplier with ID: ${id} from store: ${store_id}`,
      );
      return storeSupplier.master_suppliers;
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

      // Validate for duplicate supplier if name or tax ID is being updated
      if (
        updateSupplierDto.supplierName ||
        updateSupplierDto.taxIdentificationNumber !== undefined
      ) {
        const taxId =
          updateSupplierDto.taxIdentificationNumber === undefined
            ? existingSupplier.tax_identification_number || undefined
            : updateSupplierDto.taxIdentificationNumber;

        await this.validateDuplicateSupplier(
          updateSupplierDto.supplierName || existingSupplier.supplier_name,
          taxId,
          id,
          store_id,
        );
      }

      // Validate contact person is not empty if being updated
      if (
        updateSupplierDto.contactPerson !== undefined &&
        !updateSupplierDto.contactPerson?.trim()
      ) {
        throw new BadRequestException('Contact person cannot be empty');
      }

      const updateData: any = {};

      if (updateSupplierDto.supplierName !== undefined) {
        updateData.supplier_name = updateSupplierDto.supplierName;
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

      // Remove supplier from store relation first
      await this._prisma.stores_has_master_suppliers.deleteMany({
        where: {
          stores_id: store_id,
          master_suppliers_id: id,
        },
      });
      // Check if supplier is used in other stores
      const otherStoreRelations =
        await this._prisma.stores_has_master_suppliers.count({
          where: {
            master_suppliers_id: id,
          },
        });

      if (otherStoreRelations === 0) {
        await this._prisma.master_suppliers.delete({
          where: { id },
        });
      }

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
   * @description Validate duplicate supplier by name and tax identification number within a store
   */
  private async validateDuplicateSupplier(
    supplierName: string,
    taxIdentificationNumber?: string,
    excludeId?: string,
    storeId?: string,
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

    // Query suppliers within the same store
    const storeSuppliers =
      await this._prisma.stores_has_master_suppliers.findMany({
        where: {
          stores_id: storeId,
          master_suppliers: {
            OR: whereConditions,
            ...(excludeId && { id: { not: excludeId } }),
          },
        },
        include: {
          master_suppliers: true,
        },
      });

    if (storeSuppliers.length > 0) {
      const existingSupplier = storeSuppliers[0].master_suppliers;

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
}
