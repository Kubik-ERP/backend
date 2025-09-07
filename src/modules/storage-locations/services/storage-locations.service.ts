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
            stores_has_master_storage_locations: {
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
      whereCondition.stores_has_master_storage_locations = {
        some: {
          stores_id: storeId,
        },
      };
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
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this._prisma.stores_has_master_storage_locations.create({
      data: {
        stores_id: store_id,
        master_storage_locations_id: location.id,
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
      stores_has_master_storage_locations: {
        some: { stores_id: store_id },
      },
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
        stores_has_master_storage_locations: {
          some: { stores_id: store_id },
        },
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

    await this._prisma.stores_has_master_storage_locations.deleteMany({
      where: { stores_id: store_id, master_storage_locations_id: id },
    });

    const other = await this._prisma.stores_has_master_storage_locations.count({
      where: { master_storage_locations_id: id },
    });
    if (other === 0) {
      await this._prisma.master_storage_locations.delete({ where: { id } });
    }
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
      where.stores_has_master_storage_locations = {
        some: { stores_id: storeId },
      };
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
}
