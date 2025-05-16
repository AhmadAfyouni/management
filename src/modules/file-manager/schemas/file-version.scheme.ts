import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileVersionDocument = FileVersion & Document;

@Schema({
    timestamps: true,
    // Enable this option to ensure virtuals are included when converting to JSON/objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})
export class FileVersion {
    _id: Types.ObjectId;

    // Change the field to have a different database name but keep the same property name
    @Prop({
        type: Types.ObjectId,
        ref: 'File',
        required: true,
        // CRITICAL FIX: This makes Mongoose store the field as "file_reference" in the database
        // while your code can still access it as "fileId"
        name: 'file_reference'
    })
    fileId: Types.ObjectId;

    @Prop({ required: true })
    fileUrl: string;

    @Prop({ required: true })
    originalName: string;

    @Prop({ required: true, default: 1 })
    version: number;

    @Prop({ type: String, required: true, default: 'document' })
    fileType: string;

    @Prop({ type: Boolean, default: true })
    isCurrentVersion: boolean;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: Types.ObjectId, ref: 'Emp' })
    createdBy?: Types.ObjectId;

    @Prop()
    createdAt: Date;
}

export const FileVersionSchema = SchemaFactory.createForClass(FileVersion);

// Add a pre-save hook for debugging
FileVersionSchema.pre('save', function (next) {
    console.log('Saving FileVersion with fileId:', this.fileId);
    next();
});