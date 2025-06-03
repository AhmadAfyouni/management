import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project, ProjectSchema } from './schema/project.schema';
import { EmpModule } from '../emp/emp.module';
import { DepartmentModule } from '../department/depratment.module';
import { SectionModule } from '../section/section.module';
import { TaskModule } from '../task/task.module';
import { forwardRef } from '@nestjs/common/utils';
import { ProjectManagementService } from './project-management.service';
import { Task, TaskSchema } from '../task/schema/task.schema';
import { EmpSchema, Emp } from '../emp/schemas/emp.schema';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        MongooseModule.forFeature(
            [
                { name: Project.name, schema: ProjectSchema },
                { name: Task.name, schema: TaskSchema },
                { name: Emp.name, schema: EmpSchema }
            ]
        ),
        NotificationModule,
        EmpModule,
        DepartmentModule,
        SectionModule,
        forwardRef(() => TaskModule)
    ],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectManagementService],
    exports: [ProjectService],
})
export class ProjectModule { }
