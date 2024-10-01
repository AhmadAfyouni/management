import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/config/role.enum';

export const Role = (role: UserRole) => SetMetadata('role', role);

export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);