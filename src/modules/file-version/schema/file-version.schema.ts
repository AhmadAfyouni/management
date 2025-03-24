import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { Task } from 'src/modules/task/schema/task.schema';

export type FileVersionDocument = FileVersion & Document;

@Schema({ timestamps: true })
export class FileVersion {
    @Prop({ required: true })
    originalName: string;

    @Prop({ required: true })
    fileUrl: string;

    @Prop({ required: true })
    version: number;

    @Prop({ required: true, enum: ['supporting', 'template', 'program', 'certification', 'legal_document', 'task'] })
    fileType: string;

    @Prop({ type: Types.ObjectId, ref: Department.name })
    departmentId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Emp.name })
    empId?: Types.ObjectId;

    @Prop({ type: String })
    documentType?: string; 

    @Prop({ type: String })
    documentName?: string; 
}

export const FileVersionSchema = SchemaFactory.createForClass(FileVersion);