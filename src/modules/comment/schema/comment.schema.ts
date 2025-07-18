import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Task } from 'src/modules/task/schema/task.schema';
import { Emp } from 'src/modules/emp/schemas/emp.schema';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
    @Prop({ required: false })
    content: string;

    @Prop({ type: Types.ObjectId, required: true, ref: Task.name })
    task: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: Emp.name })
    emp: Types.ObjectId;

    @Prop({})
    fileUrl: string;

    @Prop({ type: Date })
    createdAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
