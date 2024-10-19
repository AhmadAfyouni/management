import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobCategoryDocument = JobCategory & Document;

@Schema()
export class JobCategory {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true})
    required_education: string;

    @Prop({ required: true})
    required_experience: string;

    @Prop({ type: [String], required: true })
    required_skills: string[];
}

export const JobCategorySchema = SchemaFactory.createForClass(JobCategory);
