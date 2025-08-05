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
        data: suppliers,
        page,
        pageSize,
        total,
        totalPages,
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

      // If no other store uses this supplier, delete the supplier entirely
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
