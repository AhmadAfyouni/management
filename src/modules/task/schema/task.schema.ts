import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { Project } from 'src/modules/project/schema/project.schema';
import { Section } from 'src/modules/section/schemas/section.schema';
import { PRIORITY_TYPE } from '../enums/priority.enum';
import { TASK_STATUS } from '../enums/task-status.enum';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
    _id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ enum: PRIORITY_TYPE, required: true, default: PRIORITY_TYPE.LOW })
    priority: PRIORITY_TYPE;

    @Prop({ type: Types.ObjectId, ref: Emp.name })
    emp?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Emp.name, required: false })
    assignee?: Types.ObjectId;

    @Prop({ type: String, enum: TASK_STATUS, required: true, default: TASK_STATUS.PENDING })
    status: TASK_STATUS;

    @Prop({ type: Date })
    createdAt: Date;

    @Prop({ type: Date })
    updatedAt: Date;

    @Prop({ type: Date, required: true })
    due_date: Date;

    @Prop({ type: [String], default: [] })
    files: string[];

    @Prop({ type: Boolean, default: false })
    isRecurring: boolean;

    @Prop({ type: Date, default: null })
    end_date?: Date;

    @Prop({ type: Number, default: 1 })
    intervalInDays?: number;

    @Prop({ type: Types.ObjectId, ref: Department.name })
    department_id?: Types.ObjectId;


    @Prop({ type: Types.ObjectId, ref: Project.name })
    project_id?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Section.name, required: false })
    section_id?: Types.ObjectId;

    @Prop({ type: Number, default: 0 })
    totalTimeSpent: number;

    @Prop({ type: Date, default: null })
    startTime?: Date;

    @Prop({ type: [{ start: Date, end: Date }], default: [] })
    timeLogs: { start: Date; end?: Date }[];

    @Prop({ type: Types.ObjectId, ref: Task.name, default: null })
    parent_task?: Types.ObjectId;

    @Prop({ type: String })
    over_all_time?: String;

    @Prop({ type: Number, default: 0, })
    rate: Number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
