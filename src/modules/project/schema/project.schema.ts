import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { ProjectStatus } from '../enums/project-status';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [Types.ObjectId], ref: "Department", default: [] })
    departments: Types.ObjectId[];

    @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.PENDING })
    status: ProjectStatus;

    @Prop({ type: Date, required: true })
    startDate: Date;

    @Prop({ type: Date, required: true })
    endDate: Date;

    @Prop({ type: Types.ObjectId, ref: Emp.name, required: false })
    assignee?: Types.ObjectId;

    @Prop({ type: Number, default: 0 })
    rate: Number;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
