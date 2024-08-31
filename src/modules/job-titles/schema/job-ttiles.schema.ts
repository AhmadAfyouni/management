import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobTitlesDocument = JobTitles & Document;

@Schema()
export class JobTitles {
    @Prop({ required: true, })
    name: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true, unique: true })
    grade_level: string;

    @Prop({ required: true, unique: true })
    description: string;

    @Prop({ type: Array<String>, required: true })
    responsibilities: string[];

    @Prop({ type: Array<String>, required: true })
    permissions: string[];
    @Prop({ required: true, ref: "Department" })
    department_id: Types.ObjectId
}

export const JobTitlesSchema = SchemaFactory.createForClass(JobTitles);
