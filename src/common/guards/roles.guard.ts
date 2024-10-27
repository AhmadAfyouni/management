import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayload } from "src/config/jwt-payload.interface";
import { PermissionsEnum } from "src/config/permissions.enum";
import { UserRole } from "src/config/role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<PermissionsEnum[]>('permissions', context.getHandler());
    const requiredRole = this.reflector.get<UserRole[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (!user.permissions) {
      throw new ForbiddenException('User not found');
    }

    if (requiredRole && !requiredRole.includes(user.role)) {
      throw new ForbiddenException('Access denied due to insufficient role');
    }

    if (requiredPermissions && user.permissions) {
      const hasPermission = user.permissions.some(permission =>
        requiredPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException('Access denied due to insufficient permissions');
      }
    }

    return true;
  }
}
