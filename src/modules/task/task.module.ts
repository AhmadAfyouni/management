import { Module } from "@nestjs/common/decorators";
import { forwardRef } from "@nestjs/common/utils";
import { MongooseModule } from "@nestjs/mongoose";
import { DepartmentModule } from "../department/depratment.module";
import { EmpModule } from "../emp/emp.module";
import { JobTitlesModule } from "../job-titles/job-titles.module";
import { JobTitles, JobTitlesSchema } from "../job-titles/schema/job-ttiles.schema";
import { Emp, EmpSchema } from "../emp/schemas/emp.schema";
import { NotificationModule } from "../notification/notification.module";
import { ProjectModule } from "../project/project.module";
import { SectionModule } from "../section/section.module";
import { Task, TaskSchema } from "./schema/task.schema";
import { Project, ProjectSchema } from "../project/schema/project.schema";
import { TaskSchedulerService } from "./task-scheduler.service";
import { TasksController } from "./task.controller";
import { TaskSchedulerController } from "./task-scheduler.controller";
import { TasksService } from "./task.service";

@Module({
    imports: [
        EmpModule,
        JobTitlesModule,
        SectionModule,
        DepartmentModule,
        NotificationModule,
        forwardRef(() => ProjectModule),
        MongooseModule.forFeature([
            { name: Task.name, schema: TaskSchema }, 
            { name: Project.name, schema: ProjectSchema },
            { name: JobTitles.name, schema: JobTitlesSchema },
            { name: Emp.name, schema: EmpSchema }
        ])
    ],
    providers: [TasksService, TaskSchedulerService],
    controllers: [TasksController, TaskSchedulerController],
    exports: [TasksService, TaskSchedulerService],
})
export class TaskModule { }