import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SectionDocument = Section & Document;

@Schema({ timestamps: true })
export class Section {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
    project: Types.ObjectId;

    @Prop({ type: [Types.ObjectId], ref: 'Task', default: [] })
    tasks: Types.ObjectId[];
}

export const SectionSchema = SchemaFactory.createForClass(Section);
