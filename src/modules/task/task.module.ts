import { Module } from "@nestjs/common/decorators";
import { forwardRef } from "@nestjs/common/utils";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { EmpModule } from "../emp/emp.module";
import { JobTitlesModule } from "../job-titles/job-titles.module";
import { ProjectModule } from "../project/project.module";
import { SectionModule } from "../section/section.module";
import { Task, TaskSchema } from "./schema/task.schema";
import { TaskSchedulerService } from "./task-scheduler.service";
import { TasksController } from "./task.controller";
import { TasksService } from "./task.service";

@Module({
    imports: [
        EmpModule,
        JobTitlesModule,
        SectionModule,
        DepartmentModule,
        forwardRef(()=> ProjectModule),
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])
    ],
    providers: [TasksService, TaskSchedulerService],
    controllers: [TasksController],
    exports: [TasksService],
})
export class TaskModule { }