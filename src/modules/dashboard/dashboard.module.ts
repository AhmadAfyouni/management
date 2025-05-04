import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Task, TaskSchema } from '../task/schema/task.schema';
import { Project, ProjectSchema } from '../project/schema/project.schema';
import { Emp, EmpSchema } from '../emp/schemas/emp.schema';
import { Department, DepartmentSchema } from '../department/schema/department.schema';
import { Comment, CommentSchema } from '../comment/schema/comment.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Task.name, schema: TaskSchema },
            { name: Project.name, schema: ProjectSchema },
            { name: Emp.name, schema: EmpSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Comment.name, schema: CommentSchema }
        ]),
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService]
})
export class DashboardModule { }
