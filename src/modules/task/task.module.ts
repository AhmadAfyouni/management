import { Module } from "@nestjs/common/decorators";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { EmpModule } from "../emp/emp.module";
import { Task, TaskSchema } from "./schema/task.schema";
import { TasksController } from "./task.controller";
import { TasksService } from "./task.service";

@Module({
    imports: [
        EmpModule,
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])
    ],
    providers: [TasksService],
    controllers: [TasksController],
    exports: [TasksService],
})
export class TaskModule { }