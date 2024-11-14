import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [Types.ObjectId], ref: "Department", default: [] })
    departments: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], ref: 'Section', default: [] })
    sections: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], ref: 'Emp', default: [] })
    members: Types.ObjectId[];

    @Prop({ type: Date, required: true })
    startDate: Date;

    @Prop({ type: Date, required: true })
    endDate: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
