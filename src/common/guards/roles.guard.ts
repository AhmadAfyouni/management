import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../config/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<UserRole>('role', context.getHandler())||  this.reflector.get<UserRole>('role', context.getClass()); ;    
    
    if (!requiredRole) {
      return true; 
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || user.role !== requiredRole) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
