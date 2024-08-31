import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../config/role.enum';

export const Role = (role: UserRole) => SetMetadata('role', role);
