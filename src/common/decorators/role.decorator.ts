import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/config/role.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

export const RequiredPermissions = (...permissions: string[]) => SetMetadata('permissions', permissions);