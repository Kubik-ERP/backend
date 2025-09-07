import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OwnerOrPermissionGuard extends AuthGuard('jwt') {
  private permissionsGuard: PermissionsGuard;

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {
    super();
    this.permissionsGuard = new PermissionsGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, check authentication
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if the user is an Owner by querying the database
    try {
      const userWithRole = await this.prisma.users.findUnique({
        where: { id: user.id },
        include: {
          roles: true,
        },
      });

      // If user is Owner, bypass permission checks
      if (userWithRole?.roles?.name === 'Owner') {
        return true;
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      // If there's an error checking role, fall back to regular permission checking
    }

    // If not Owner, check permissions normally
    return this.permissionsGuard.canActivate(context);
  }

  handleRequest(
    error: Error,
    user: any,
    info: string,
    context: ExecutionContext,
  ) {
    // Handle authentication errors
    if (error || !user) {
      console.log(`[ERROR] OwnerOrPermissionGuard: ${info}`);
      throw error || new Error('Unauthorized');
    }

    // Extract permissions from the user object if available
    // Permissions are already filtered by store_id in JWT strategy
    if (user.roles?.store_role_permissions) {
      user.permissions = user.roles.store_role_permissions.map(
        (rp: any) => rp.permissions.key,
      );
    }

    return user;
  }
}
