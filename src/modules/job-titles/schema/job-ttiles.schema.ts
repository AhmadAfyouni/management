import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PermissionsEnum } from 'src/config/permissions.enum';
import { JobCategory } from 'src/modules/job-category/schemas/job-category.schema';

export type JobTitlesDocument = JobTitles & Document;

@Schema()
export class JobTitles {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true, unique: true })
    grade_level: string;

    @Prop({ required: true, unique: true })
    description: string;

    @Prop({ type: [String], required: true })
    responsibilities: string[];

    @Prop({ type: Types.ObjectId, ref: "Department", required: true })
    department_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: JobCategory.name, required: true })
    category: Types.ObjectId;

    @Prop({ type: [String], enum: PermissionsEnum, required: true })
    permissions: PermissionsEnum[];
}

export const JobTitlesSchema = SchemaFactory.createForClass(JobTitles);
