import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    return this.prisma.roles.create({
      data: {
        name: dto.name,
        store_id,
        updated_at: new Date(),
      },
    });
  }

  async findAll(dto: RolesListDto, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

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
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }
    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    // TODO(RBAC): menunggu konfirmasi apakah perlu ada role yang paten
    if (role.is_system) {
      throw new BadRequestException('Cannot update system role.');
    }

    return await this.prisma.roles.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string, header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    const role = await this.prisma.roles.findUnique({
      where: {
        id,
        OR: [{ store_id }, { store_id: null, is_system: true }],
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found.`);
    }

    // TODO(RBAC): menunggu konfirmasi apakah perlu ada role yang paten
    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role.');
    }

    // TODO(RBAC): tambahin kondisi gak bisa edit, jika role udah di pake

    return this.prisma.roles.delete({ where: { id } });
  }
}
