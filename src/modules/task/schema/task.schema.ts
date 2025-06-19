import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProgressCalculationMethod } from 'src/modules/company-settings/schemas/company-settings.schema';
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

    // Enhanced date fields for better progress calculation
    @Prop({ type: Date, required: true })
    start_date: Date;

    @Prop({ type: Date })
    actual_end_date?: Date;

    @Prop({ type: Date })
    expected_end_date?: Date;

    // Enhanced time tracking fields
    @Prop({ type: Number, default: 0 })
    estimated_hours?: number;

    @Prop({ type: Number, default: 0 })
    actual_hours?: number;

    @Prop({ type: [String], default: [] })
    files: string[];

    // Recurring task enhancements
    @Prop({ type: Boolean, default: false })
    isRecurring: boolean;

    @Prop({ type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] })
    recurringType?: string;

    @Prop({ type: Number, default: 1 })
    intervalInDays?: number;

    @Prop({ type: Date, default: null })
    recurringEndDate?: Date;

    @Prop({ type: Boolean, default: false })
    isRoutineTask: boolean; // For Job Title linked routine tasks

    @Prop({ type: String })
    routineTaskId?: string; // Link to the main routine task

    @Prop({ type: Types.ObjectId, ref: Department.name })
    department_id?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Project.name })
    project_id?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Section.name, required: false })
    section_id?: Types.ObjectId;

    // Progress calculation fields
    @Prop({ type: Number, default: 0, min: 0, max: 100 })
    progress: number;

    @Prop({ type: String, enum: ProgressCalculationMethod, default: 'time_based' })
    progressCalculationMethod: string;

    // Enhanced time tracking
    @Prop({ type: Number, default: 0 })
    totalTimeSpent: number;

    @Prop({ type: Date, default: null })
    startTime?: Date;

    @Prop({ type: [{ start: Date, end: Date }], default: [] })
    timeLogs: { start: Date; end?: Date }[];

    // Task relationships
    @Prop({ type: Types.ObjectId, ref: Task.name, default: null })
    parent_task?: Types.ObjectId;

    @Prop({ type: [Types.ObjectId], ref: Task.name, default: [] })
    sub_tasks: Types.ObjectId[];

    // Additional fields
    @Prop({ type: String })
    over_all_time?: String;

    @Prop({ type: Number, default: 0 })
    rate: Number;

    // Validation fields
    @Prop({ type: Boolean, default: false })
    hasLoggedHours: boolean; // Track if any hours have been logged

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    // Legacy fields (keeping for backward compatibility)
    @Prop({ type: Date, default: null })
    end_date?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
