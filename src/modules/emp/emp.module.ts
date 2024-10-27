import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { TaskStatusModule } from "../task status/task-stauts.module";
import { TaskTypeModule } from "../task type/task-type.module";
import { EmpController } from "./emp.controller";
import { EmpService } from "./emp.service";
import { Emp, EmpSchema } from "./schemas/emp.schema";
@Global()
@Module(
    {
        imports: [
            MongooseModule.forFeature([{ name: Emp.name, schema: EmpSchema },]),
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