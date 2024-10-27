import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionsEnum } from "src/config/permissions.enum";
import { UserRole } from "src/config/role.enum";
import { Emp, EmpDocument } from '../../modules/emp/schemas/emp.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<PermissionsEnum[]>('permissions', context.getHandler());
    const requiredRole = this.reflector.get<UserRole[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const userWithRoles = await this.empModel.findById(user.userId).populate({
      path: 'job_id',
      populate: {
        path: 'permissions',
        model: 'Permission',
      },
    }).lean().exec() as any;

    if (!userWithRoles) {
      throw new ForbiddenException('User not found');
    }

    if (requiredRole && !requiredRole.includes(userWithRoles.role)) {
      throw new ForbiddenException('Access denied due to insufficient role');
    }

    if (requiredPermissions && userWithRoles.job_id.permissions) {
      const hasPermission = userWithRoles.job_id.permissions.some(permission =>
        requiredPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException('Access denied due to insufficient permissions');
      }
    }

    return true;
  }
}
