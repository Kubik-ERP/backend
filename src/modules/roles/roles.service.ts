import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesListDto } from './dto/roles-list.dto';
import { Prisma } from '@prisma/client';
import {
  camelToSnake,
  toCamelCase,
} from 'src/common/helpers/object-transformer.helper';
import {
  getOffset,
  getTotalPages,
} from 'src/common/helpers/pagination.helpers';
import { requireStoreId } from 'src/common/helpers/common.helpers';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Creating new role "${dto.name}" for store ${store_id}`);

    const result = await this.prisma.roles.create({
      data: {
        name: dto.name,
        store_id,
        updated_at: new Date(),
      },
    });

    this.logger.log(
      `Successfully created role "${result.name}" with ID ${result.id}`,
    );
    return result;
  }

  async findAll(dto: RolesListDto, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    // --- Filter
    const filters: Prisma.rolesWhereInput = {
      OR: [{ store_id }, { store_id: null, is_system: true }],
    };

    // --- Order By
    const orderByField = camelToSnake(dto.orderBy);
    const orderDirection = dto.orderDirection;
    const orderBy: Prisma.rolesOrderByWithRelationInput[] = [
      {
        [orderByField]: orderDirection,
      },
    ];

    const [items, total] = await Promise.all([
      this.prisma.roles.findMany({
        where: filters,
        skip: getOffset(dto.page, dto.pageSize),
        take: dto.pageSize,
        orderBy: orderBy,
      }),
      this.prisma.roles.count({ where: filters }),
    ]);

    return {
      items: items.map(toCamelCase),
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: getTotalPages(total, dto.pageSize),
      },
    };
  }

  async findOne(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      this.logger.warn(`Role with id ${id} not found in store ${store_id}`);
      throw new NotFoundException(`Role with id ${id} not found.`);
    }
    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Updating role ${id} for store ${store_id}`);

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      this.logger.warn(`Role with id ${id} not found in store ${store_id}`);
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    if (role.is_system) {
      this.logger.warn(`Attempted to update system role ${id}`);
      throw new BadRequestException('Cannot update system role.');
    }

    const result = await this.prisma.roles.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        updated_at: new Date(),
      },
    });

    this.logger.log(
      `Successfully updated role "${result.name}" with ID ${result.id}`,
    );
    return result;
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log(`Removing role ${id} from store ${store_id}`);

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      this.logger.warn(`Role with id ${id} not found in store ${store_id}`);
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    if (role.is_system) {
      this.logger.warn(`Attempted to delete system role ${id}`);
      throw new BadRequestException('Cannot delete system role.');
    }

    const result = await this.prisma.roles.delete({ where: { id } });
    this.logger.log(
      `Successfully removed role "${result.name}" with ID ${result.id}`,
    );
    return result;
  }
}
