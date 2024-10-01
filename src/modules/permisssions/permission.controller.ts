import { Controller, Get } from '@nestjs/common';
import { PermissionService } from './permission.service';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('all-permissions')
  async getAllPermissions() {
    return this.permissionService.getAllPermissions();
  }
}
