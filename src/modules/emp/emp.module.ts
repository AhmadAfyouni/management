import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { Permission, PermissionSchema } from "../permisssions/schema/permission.schema";
import { Role, RoleSchema } from "../permisssions/schema/role.schema";
import { TaskStatusModule } from "../task status/task-stauts.module";
import { TaskTypeModule } from "../task type/task-type.module";
import { EmpController } from "./emp.controller";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schema/emp.schema";
@Global()
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema },
                 { name: Role.name, schema: RoleSchema },
                 { name: Permission.name, schema: PermissionSchema },
            ]),
            DepartmentModule,
            TaskTypeModule,
            TaskStatusModule,
        ],

        controllers: [EmpController],
        providers: [EmpService],
        exports: [EmpService, MongooseModule]
    }
)
export class EmpModule { }