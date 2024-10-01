import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Permission, PermissionDocument } from "./schema/permission.schema";
import { Role, RoleDocument } from "./schema/role.schema";

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Permission.name) private permissionModel: Model<PermissionDocument>,
  ) { }
  
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await this.permissionModel.find().exec();
    } catch (error) {
      throw new Error('Failed to fetch permissions');
    }
  }
  
  async getAllRoles(): Promise<Role[]> {
    try {
      return await this.roleModel.find().populate('permissions').exec(); // Populate permissions field
    } catch (error) {
      throw new Error('Failed to fetch roles');
    }
  }
}
