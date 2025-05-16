import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { Task } from 'src/modules/task/schema/task.schema';
import { FileType } from '../dto/file-version.dto';

export type FileVersionDocument = FileVersionOld & Document;

@Schema({ timestamps: true })
export class FileVersionOld {
    @Prop({ required: true })
    originalName: string;

    @Prop({ required: true })
    fileUrl: string;

    @Prop({ required: true })
    version: number;

    @Prop({ required: true, type: String })
    fileType: string;

    @Prop({ type: Types.ObjectId, ref: Department.name })
    departmentId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Emp.name })
    empId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Task.name })
    taskId?: Types.ObjectId;

    @Prop({ type: String })
    documentType?: string;

    @Prop({ type: String })
    documentName?: string;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: Types.ObjectId, ref: Emp.name })
    createdBy?: Types.ObjectId;

    @Prop({ type: String })
    mimeType?: string;

    @Prop({ type: Number })
    fileSize?: number;

    @Prop()
    fileId: string;
    @Prop({ type: Boolean, default: false })
    isCurrentVersion: boolean;

    @Prop({})
    createdAt: Date;
}

export const FileVersionSchema = SchemaFactory.createForClass(FileVersionOld);