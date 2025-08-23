import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignPermissionsToRolesDto } from './dto/assign-permissions-to-roles.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly _prisma: PrismaService) {}

  // TODO(RBAC): low priority - find a better way to do this
  async assignToRoles(
    dto: AssignPermissionsToRolesDto,
    header: ICustomRequestHeaders,
  ) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    // build desired pairs
    const desired: {
      role_id: string;
      permission_id: string;
      store_id: string;
    }[] = [];
    for (const item of dto.permissions ?? []) {
      if (!item?.id) continue;
      const uniq = new Set(item.roles ?? []);
      for (const roleId of uniq) {
        desired.push({
          role_id: roleId,
          permission_id: item.id,
          store_id: store_id,
        });
      }
    }

    return this._prisma.$transaction(async (tx) => {
      const delRes = await tx.store_role_permissions.deleteMany({
        where: { store_id: store_id },
      });

      let inserted = 0;
      if (desired.length) {
        const insRes = await tx.store_role_permissions.createMany({
          data: desired,
          skipDuplicates: true,
        });
        inserted = insRes.count ?? desired.length;
      }

      return {
        deleted: delRes.count ?? 0,
        inserted,
      };
    });
  }

  async findAll(header: ICustomRequestHeaders) {
    // --- Memastikan store_id ada di header
    const store_id = header.store_id;
    if (!store_id) {
      throw new BadRequestException('store_id is required');
    }

    return await this._prisma.permission_categories.findMany({
      include: {
        permissions: {
          include: {
            store_role_permissions: {
              include: {
                roles: true,
              },
            },
          },
        },
      },
    });
  }
}
