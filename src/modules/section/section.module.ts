import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SectionService } from './section.service';
import { SectionController } from './section.controller';
import { Section, SectionSchema } from './schemas/section.schema';
import { Task, TaskSchema } from '../task/schema/task.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Section.name, schema: SectionSchema }, { name: Task.name, schema: TaskSchema }])],
    controllers: [SectionController],
    providers: [SectionService],
    exports: [SectionService],
})
export class SectionModule { }
