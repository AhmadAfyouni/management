import typia from "typia";
import { UserRole } from "./role.enum";

export class JwtPayload {
  email!: string;
  sub!: string;
  department!: any;
  role!: UserRole;
  iat?: number;  
  exp?: number;  
}

export const validateJwtPayload = typia.createAssert<JwtPayload>();
