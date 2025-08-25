import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { TPermissions } from '../../types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      TPermissions[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      return true; // No permissions required, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('User has no permissions');
    }

    console.log({ user });
    // Check if user has at least one of the required permissions (OR logic)
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions (at least one): ${requiredPermissions.join(' OR ')}`,
      );
    }

    return true;
  }
}
