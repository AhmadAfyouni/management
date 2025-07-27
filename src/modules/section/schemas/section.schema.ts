import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Project } from 'src/modules/project/schema/project.schema';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';

export type SectionDocument = Section & Document;

@Schema({ timestamps: true })
export class Section {
    _id: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: Emp.name, required: false })
    emp?: Types.ObjectId;

    @Prop({ enum: ['default', 'normal'], default: 'normal' })
    type: string;
}

export const SectionSchema = SchemaFactory.createForClass(Section);
