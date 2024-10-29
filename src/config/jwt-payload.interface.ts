import typia from "typia";
import { PermissionsEnum } from "./permissions.enum";
import { UserRole } from "./role.enum";

export class JwtPayload {
  email!: string;
  sub!: string;
  department!: any;
  permissions!: PermissionsEnum[];
  accessibleDepartments!: any;
  accessibleEmps!: any;
  accessibleJobTitles!: any;
  role!: UserRole;
  iat?: number;
  exp?: number;
}

export const validateJwtPayload = typia.createAssert<JwtPayload>();
