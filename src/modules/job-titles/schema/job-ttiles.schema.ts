import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { JobCategory } from 'src/modules/job-category/schemas/job-category.schema';

export type JobTitlesDocument = JobTitles & Document;

@Schema()
export class RoutineTask {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true })
    recurringType: string;

    @Prop({ type: Number, default: 1 })
    intervalDays: number;

    @Prop({ type: Number, default: 0 })
    estimatedHours: number;

    @Prop({ type: String, enum: ['low', 'medium', 'high'], default: 'medium' })
    priority: string;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: [String], default: [] })
    instructions: string[];

    @Prop({ type: Boolean, default: false })
    hasSubTasks: boolean;

    @Prop({ type: [{ name: String, description: String, estimatedHours: Number }], default: [] })
    subTasks: { name: string; description: string; estimatedHours: number }[];
}

@Schema()
export class JobTitles {

    _id: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [String], required: true })
    responsibilities: string[];

    @Prop({ type: Types.ObjectId, ref: "Department", required: true })
    department_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: JobCategory.name, required: true })
    category: Types.ObjectId;

    @Prop({ type: [String], enum: PermissionsEnum, required: true })
    permissions: PermissionsEnum[];

    @Prop({ type: [Types.ObjectId], ref: 'Department' })
    accessibleDepartments: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], ref: 'Department' })
    accessibleEmps: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], ref: 'Department' })
    accessibleJobTitles: Types.ObjectId[];

    @Prop({ type: Boolean, default: false })
    is_manager?: boolean;

    // New routine tasks field
    @Prop({ type: [RoutineTask], default: [] })
    routineTasks: RoutineTask[];

    @Prop({ type: Boolean, default: false })
    hasRoutineTasks: boolean;

    @Prop({ type: Boolean, default: true })
    autoGenerateRoutineTasks: boolean;
}

export const JobTitlesSchema = SchemaFactory.createForClass(JobTitles);
