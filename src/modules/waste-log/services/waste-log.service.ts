import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateWasteLogDto,
  CreateWasteLogItemDto,
  GetWasteLogsDto,
  UpdateWasteLogDto,
  UpdateWasteLogItemDto,
  WasteLogListResponseDto,
  WasteLogResponseDto,
} from '../dtos';
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';

@Injectable()
export class WasteLogService {
  private readonly logger = new Logger(WasteLogService.name);

  constructor(private readonly _prisma: PrismaService) {}

  public async create(
    dto: CreateWasteLogDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    try {
      // Start transaction
      const result = await this._prisma.$transaction(async (tx) => {
        // Create waste log
        const wasteLog = await tx.waste_log.create({
          data: {
            waste_log_id: uuidv4(),
            batch_id: dto.batchId || null,
            store_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Create waste log items with pre-processed photo URLs
        const wasteLogItems = [];
        for (let i = 0; i < dto.payload.length; i++) {
          const item = dto.payload[i];

          const wasteLogItem = await tx.waste_log_item.create({
            data: {
              waste_log_item_id: uuidv4(),
              waste_log_id: wasteLog.waste_log_id,
              inventory_item_id: item.inventory_item_id,
              category: item.category || null,
              quantity: item.quantity,
              uom: item.uom || null,
              notes: item.notes || null,
              photo_url: (item as any).photo_url || null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          wasteLogItems.push(wasteLogItem);
        }

        return { wasteLog, wasteLogItems };
      });

      // Fetch complete data with relations
      return await this.detail(result.wasteLog.waste_log_id, header);
    } catch (error) {
      this.logger.error('Error creating waste log:', error);
      throw new BadRequestException('Failed to create waste log');
    }
  }

  public async detail(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const wasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
      include: {
        waste_log_item: {
          include: {
            master_inventory_items: {
              select: {
                name: true,
              },
            },
          },
        },
        stores: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!wasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    return {
      wasteLogId: wasteLog.waste_log_id,
      batchId: wasteLog.batch_id || undefined,
      storeId: wasteLog.store_id,
      storeName: wasteLog.stores?.name || undefined,
      wasteLogItems: wasteLog.waste_log_item.map((item) => ({
        wasteLogItemId: item.waste_log_item_id,
        inventoryItemId: item.inventory_item_id,
        inventoryItemName: item.master_inventory_items?.name,
        category: item.category || undefined,
        quantity: Number(item.quantity),
        uom: item.uom || undefined,
        notes: item.notes || undefined,
        photoUrl: item.photo_url || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      createdAt: wasteLog.created_at,
      updatedAt: wasteLog.updated_at,
    };
  }

  public async update(
    id: string,
    dto: UpdateWasteLogDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    try {
      await this._prisma.$transaction(async (tx) => {
        // Update waste log
        await tx.waste_log.update({
          where: { waste_log_id: id },
          data: {
            batch_id: dto.batchId || null,
            updated_at: new Date(),
          },
        });

        // Delete existing items
        await tx.waste_log_item.deleteMany({
          where: { waste_log_id: id },
        });

        // Create new items with pre-processed photo URLs
        for (let i = 0; i < dto.payload.length; i++) {
          const item = dto.payload[i];

          await tx.waste_log_item.create({
            data: {
              waste_log_item_id: uuidv4(),
              waste_log_id: id,
              inventory_item_id: item.inventory_item_id,
              category: item.category || null,
              quantity: item.quantity,
              uom: item.uom || null,
              notes: item.notes || null,
              photo_url: (item as any).photo_url || null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      });

      return await this.detail(id, header);
    } catch (error) {
      this.logger.error('Error updating waste log:', error);
      throw new BadRequestException('Failed to update waste log');
    }
  }

  public async list(
    query: GetWasteLogsDto,
    header: ICustomRequestHeaders,
  ): Promise<WasteLogListResponseDto> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;
    const offset = (page - 1) * limit;

    const where: any = {
      store_id,
    };

    if (search) {
      where.OR = [
        { batch_id: { contains: search, mode: 'insensitive' } },
        {
          waste_log_item: {
            some: {
              master_inventory_items: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [wasteLogs, total] = await Promise.all([
      this._prisma.waste_log.findMany({
        where,
        include: {
          waste_log_item: {
            include: {
              master_inventory_items: {
                select: {
                  name: true,
                },
              },
            },
          },
          stores: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this._prisma.waste_log.count({ where }),
    ]);

    const data = wasteLogs.map((wasteLog) => ({
      wasteLogId: wasteLog.waste_log_id,
      batchId: wasteLog.batch_id || undefined,
      storeId: wasteLog.store_id,
      storeName: wasteLog.stores?.name || undefined,
      wasteLogItems: wasteLog.waste_log_item.map((item) => ({
        wasteLogItemId: item.waste_log_item_id,
        inventoryItemId: item.inventory_item_id,
        inventoryItemName: item.master_inventory_items?.name,
        category: item.category || undefined,
        quantity: Number(item.quantity),
        uom: item.uom || undefined,
        notes: item.notes || undefined,
        photoUrl: item.photo_url || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
      createdAt: wasteLog.created_at,
      updatedAt: wasteLog.updated_at,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async remove(
    id: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: id,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    try {
      await this._prisma.$transaction(async (tx) => {
        // Delete waste log items first (due to foreign key constraint)
        await tx.waste_log_item.deleteMany({
          where: { waste_log_id: id },
        });

        // Delete waste log
        await tx.waste_log.delete({
          where: { waste_log_id: id },
        });
      });
    } catch (error) {
      this.logger.error('Error deleting waste log:', error);
      throw new BadRequestException('Failed to delete waste log');
    }
  }

  public async removeItem(
    wasteLogId: string,
    itemId: string,
    header: ICustomRequestHeaders,
  ): Promise<void> {
    const store_id = header.store_id;
    if (!store_id) throw new BadRequestException('store_id is required');

    // Check if waste log exists and belongs to the store
    const existingWasteLog = await this._prisma.waste_log.findFirst({
      where: {
        waste_log_id: wasteLogId,
        store_id,
      },
    });

    if (!existingWasteLog) {
      throw new NotFoundException('Waste log not found');
    }

    // Check if waste log item exists
    const existingItem = await this._prisma.waste_log_item.findFirst({
      where: {
        waste_log_item_id: itemId,
        waste_log_id: wasteLogId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Waste log item not found');
    }

    try {
      await this._prisma.waste_log_item.delete({
        where: { waste_log_item_id: itemId },
      });
    } catch (error) {
      this.logger.error('Error deleting waste log item:', error);
      throw new BadRequestException('Failed to delete waste log item');
    }
  }
}
