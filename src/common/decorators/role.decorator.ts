import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { JwtPayload } from 'src/config/jwt-payload.interface';
import { UserRole } from 'src/config/role.enum';
import { JobTitlesDocument } from 'src/modules/job-titles/schema/job-ttiles.schema';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

export const RequiredPermissions = (...permissions: string[]) => SetMetadata('permissions', permissions);


