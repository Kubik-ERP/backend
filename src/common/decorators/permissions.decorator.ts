import { SetMetadata } from '@nestjs/common';
import { TPermissions } from '../../types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: TPermissions[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
