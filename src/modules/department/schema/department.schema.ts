import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    goal: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: true })
    mainTasks: string;
    @Prop({ type: Types.ObjectId, ref: "Department", default: null })
    parent_department_id?: Types.ObjectId | null;

    @Prop({ type: [{ category: String, count: Number }], default: [] })
    numericOwners: { category: string; count: number }[];
    @Prop({ type: [String], default: [] })
    supportingFiles: string[];

    @Prop({ type: [Object], default: [] })
    requiredReports: Array<{
        name: string;
        templateFile: string;
    }>;

    @Prop({ type: [Object], default: [] })
    developmentPrograms: Array<{
        programName: string;
        objective: string;
        notes?: string;
        programFile?: string;
    }>;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
