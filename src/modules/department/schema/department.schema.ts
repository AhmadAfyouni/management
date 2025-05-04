import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
    _id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    goal: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: true })
    mainTasks: string;

    @Prop({ type: Types.ObjectId, ref: "Department", default: undefined })
    parent_department_id?: Types.ObjectId;

    @Prop({
        type: [
            {
                category: { type: String, required: true },
                count: { type: Number, required: true },
            }
        ],
        default: []
    })
    numericOwners: Array<{ category: string; count: number }>;

    @Prop({ type: [String], default: [] })
    supportingFiles: string[];

    @Prop({
        type: [
            {
                name: { type: String, required: true },
                templateFile: { type: String, required: true }
            }
        ],
        default: []
    })
    requiredReports: Array<{
        name: string;
        templateFile: string;
    }>;

    @Prop({
        type: [
            {
                programName: { type: String, required: true },
                objective: { type: String, required: true },
                notes: { type: String, default: null },
                programFile: { type: String, default: null }
            }
        ],
        default: []
    })
    developmentPrograms: Array<{
        programName: string;
        objective: string;
        notes?: string;
        programFile?: string;
    }>;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
