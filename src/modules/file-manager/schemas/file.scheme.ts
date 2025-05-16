import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
    _id: Types.ObjectId;

    @Prop({ required: true })
    originalName: string;

    @Prop({ required: true })
    entityType: string; // 'department', 'employee', 'task'

    @Prop({ type: Types.ObjectId, required: true })
    entityId: Types.ObjectId;

    @Prop({ type: String, required: true, default: 'document' })
    fileType: string; // 'supporting', 'template', 'program', etc.

    @Prop({ type: Types.ObjectId, ref: 'FileVersion' })
    currentVersion: Types.ObjectId;
}

export const FileSchema = SchemaFactory.createForClass(File);