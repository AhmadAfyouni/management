import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project, ProjectSchema } from './schema/project.schema';
import { EmpModule } from '../emp/emp.module';
import { DepartmentModule } from '../department/depratment.module';
import { SectionModule } from '../section/section.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
        EmpModule,
        DepartmentModule,
        SectionModule
    ],
    controllers: [ProjectController],
    providers: [ProjectService],
    exports: [ProjectService],
})
export class ProjectModule { }
