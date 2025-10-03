import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthPermissionGuard extends AuthGuard('jwt') {
  private permissionsGuard: PermissionsGuard;

  constructor(private reflector: Reflector) {
    super();
    this.permissionsGuard = new PermissionsGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, check authentication
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Then, check permissions
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
      console.log(`[ERROR] AuthPermissionGuard: ${info}`);
      throw error || new UnauthorizedException('Unauthorized');
    }

    const subExpiredAt = user.sub_expired_at
      ? new Date(user.sub_expired_at)
      : null;

    if (subExpiredAt && subExpiredAt <= new Date()) {
      throw new UnauthorizedException('Subscription has expired');
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
