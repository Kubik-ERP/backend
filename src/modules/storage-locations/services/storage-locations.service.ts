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

  async create(dto: CreateStorageLocationDto, header: ICustomRequestHeaders) {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    await this.ensureNotDuplicate(dto.name, undefined, store_id);

    const location = await this._prisma.master_storage_locations.create({
      data: {
        name: dto.name,
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

    this.logger.log(`Storage location created: ${location.name}`);
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
    if (search) where.name = { contains: search, mode: 'insensitive' };

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

    const updated = await this._prisma.master_storage_locations.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
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
