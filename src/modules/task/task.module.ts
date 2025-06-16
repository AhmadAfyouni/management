import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils';
import { MongooseModule } from '@nestjs/mongoose';
import { EmpModule } from '../emp/emp.module';
import { JobTitlesModule } from '../job-titles/job-titles.module';
import { Emp, EmpSchema } from '../emp/schemas/emp.schema';
import { NotificationModule } from '../notification/notification.module';
import { ProjectModule } from '../project/project.module';
import { Task, TaskSchema } from './schema/task.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { TaskSchedulerService } from './task-scheduler.service';
import { TasksController } from './task.controller';
import { TaskSchedulerController } from './task-scheduler.controller';
import { TaskCoreService } from './task-core.service';
import { TaskSubtaskService } from './task-subtask.service';
import { TaskTimeTrackingService } from './task-time-tracking.service';
import { TaskValidationService } from './task-validation.service';
import { TaskQueryService } from './task-query.service';
import { TaskStatusService } from './task.status.service';
import { JobTitles, JobTitlesSchema } from '../job-titles/schema/job-ttiles.schema';
import { DepartmentModule } from '../department/depratment.module';
import { SectionModule } from '../section/section.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';

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
            { name: Emp.name, schema: EmpSchema },
        ]),
        CompanySettingsModule
    ],
    providers: [
        TaskCoreService,
        TaskSubtaskService,
        TaskTimeTrackingService,
        TaskValidationService,
        TaskQueryService,
        TaskStatusService,
        TaskSchedulerService,
    ],
    controllers: [TasksController, TaskSchedulerController],
    exports: [
        TaskCoreService,
        TaskSubtaskService,
        TaskTimeTrackingService,
        TaskValidationService,
        TaskQueryService,
        TaskStatusService,
        TaskSchedulerService,
    ],
})
export class TaskModule { }