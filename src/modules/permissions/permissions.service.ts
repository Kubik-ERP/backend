import { Injectable, Logger } from '@nestjs/common';
import { AssignPermissionsToRolesDto } from './dto/assign-permissions-to-roles.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { requireStoreId } from 'src/common/helpers/common.helpers';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  constructor(private readonly _prisma: PrismaService) {}

  // TODO(RBAC): low priority - find a better way to do this
  async assignToRoles(
    dto: AssignPermissionsToRolesDto,
    header: ICustomRequestHeaders,
  ) {
    const store_id = requireStoreId(header);
    this.logger.log(`Assigning permissions to roles for store ${store_id}`);

    // build desired pairs
    const desired: {
      role_id: string;
      permission_id: string;
      store_id: string;
    }[] = [];
    for (const item of dto.permissions ?? []) {
      if (!item?.id) {
        this.logger.warn(`Skipping permission with no ID`);
        continue;
      }
      const uniq = new Set(item.roles ?? []);
      this.logger.log(
        `Processing permission ${item.id} for ${uniq.size} unique roles`,
      );
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

      const result = {
        deleted: delRes.count ?? 0,
        inserted,
      };
      this.logger.log(
        `Successfully updated permissions: deleted ${result.deleted}, inserted ${result.inserted} permission-role pairs`,
      );
      return result;
    });
  }

  async findAll(header: ICustomRequestHeaders) {
    const store_id = requireStoreId(header);
    this.logger.log('Fetching all permission categories with permissions');
    const result = await this._prisma.permission_categories.findMany({
      include: {
        permissions: {
          include: {
            store_role_permissions: {
              where: {
                store_id: store_id,
              },
              select: {
                role_id: true,
              },
            },
          },
        },
      },
    });
    this.logger.log(`Found ${result.length} permission categories`);
    return result;
  }
}
