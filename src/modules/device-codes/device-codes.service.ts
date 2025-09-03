import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateDeviceCodeDto } from './dto/create-device-code.dto';
import { UpdateDeviceCodeDto } from './dto/update-device-code.dto';
import { DeviceCodesListDto } from './dto/device-codes-list.dto';
import {
  randomBase16,
  requireStoreId,
} from 'src/common/helpers/common.helpers';
import { camelToSnake } from 'src/common/helpers/object-transformer.helper';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';

@Injectable()
export class DeviceCodesService {
  private readonly logger = new Logger(DeviceCodesService.name);

  constructor(private readonly _prisma: PrismaService) {}

  async create(
    createDeviceCodeDto: CreateDeviceCodeDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Creating new device code for store ${store_id}`);

    const newDeviceCode = await this._prisma.device_codes.create({
      data: {
        ...createDeviceCodeDto,
        store_id,
        code: randomBase16(9),
      },
    });

    this.logger.log(
      `Successfully created device code with code ${newDeviceCode.code}`,
    );
    return newDeviceCode;
  }

  async findAll(query: DeviceCodesListDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    const filters: Prisma.device_codesWhereInput = {
      store_id,
    };

    // --- Order By
    const orderByField = camelToSnake(query.orderBy);
    const orderDirection = query.orderDirection;
    const orderBy: Prisma.device_codesOrderByWithRelationInput[] = [
      {
        [orderByField]: orderDirection,
      },
    ];

    const [items, total] = await Promise.all([
      this._prisma.device_codes.findMany({
        where: filters,
        skip: getOffset(query.page, query.pageSize),
        take: query.pageSize,
        orderBy: orderBy,
      }),
      this._prisma.device_codes.count({
        where: filters,
      }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: getTotalPages(total, query.pageSize),
      },
    };
  }

  async findOne(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    const deviceCode = await this._prisma.device_codes.findUnique({
      where: { id, store_id },
    });

    if (!deviceCode) {
      this.logger.error(`Device code with ID ${id} not found`);
      throw new NotFoundException(`Device code with ID ${id} not found`);
    }

    return deviceCode;
  }

  async update(
    id: string,
    updateDeviceCodeDto: UpdateDeviceCodeDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Updating device code ${id} for store ${store_id}`);

    const deviceCode = await this._prisma.device_codes.update({
      where: { id, store_id },
      data: updateDeviceCodeDto,
    });

    this.logger.log(`Successfully updated device code ${id}`);
    return deviceCode;
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Removing device code ${id} from store ${store_id}`);

    const deviceCode = await this._prisma.device_codes.findFirst({
      where: {
        id,
        store_id,
      },
    });
    if (!deviceCode) {
      this.logger.error(`Device code with ID ${id} not found`);
      throw new NotFoundException(`Device code with ID ${id} not found`);
    }

    if (deviceCode.status === 'connected') {
      this.logger.error(
        `Cannot delete device code ${id} because it is connected`,
      );
      throw new BadRequestException(
        'Device code that has been connected cannot be deleted',
      );
    }

    const deletedDeviceCode = await this._prisma.device_codes.delete({
      where: { id, store_id },
    });

    this.logger.log(`Successfully removed device code ${id}`);
    return deletedDeviceCode;
  }

  async disconnect(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Disconnecting device code ${id} from store ${store_id}`);

    const deviceCode = await this._prisma.device_codes.findFirst({
      where: {
        id,
        store_id,
      },
    });

    if (!deviceCode) {
      this.logger.error(`Device code with ID ${id} not found`);
      throw new NotFoundException(`Device code with ID ${id} not found`);
    }

    if (deviceCode.status === 'disconnected') {
      this.logger.error(`Device code with ID ${id} is already disconnected`);
      throw new BadRequestException(
        `Device code with ID ${id} is already disconnected`,
      );
    }

    const updatedDeviceCode = await this._prisma.device_codes.update({
      where: { id, store_id },
      data: {
        status: 'disconnected',
        employee_id: null,
        employee_login_sessions: {
          delete: true,
        },
      },
    });

    this.logger.log(`Successfully disconnected device code ${id}`);
    return updatedDeviceCode;
  }
}
