import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Emp, EmpDocument } from 'src/modules/emp/schema/emp.schema';
import { UserRole } from "src/config/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Emp.name) private empModel: Model<EmpDocument>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<UserRole>('role', context.getHandler()) || this.reflector.get<UserRole>('role', context.getClass());
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userWithRoles = await this.empModel.findById(user.userId).populate({
      path: 'job_id',
      populate: {
        path: 'permissions',
        model: 'Permission',
      },
    }).exec() as any;
    if (!userWithRoles) {
      throw new ForbiddenException('User not found');
    }

    // Check for the required role
    // if (requiredRole && !userWithRoles.roles.some(role => role.name === requiredRole)) {
    //   throw new ForbiddenException('Access denied due to insufficient role');
    // }

    if (requiredPermissions) {
      const hasPermission = userWithRoles.job_id.permissions.some(permission =>
        requiredPermissions.includes(`${permission.resource}:${permission.action}`)
      );
      
      if (!hasPermission) {
        throw new ForbiddenException('Access denied due to insufficient permissions');
      }
    }

    return true;
  }
}
