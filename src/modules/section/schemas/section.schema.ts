import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Project } from 'src/modules/project/schema/project.schema';
import { Department } from 'src/modules/department/schema/department.schema';

export type SectionDocument = Section & Document;

@Schema({ timestamps: true })
export class Section {
    
    _id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: Department.name, required: false })
    department?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Project.name, required: false })
    project?: Types.ObjectId;
}

export const SectionSchema = SchemaFactory.createForClass(Section);
