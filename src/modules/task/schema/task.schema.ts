import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { TaskStatus } from 'src/modules/task status/schema/task-status.schema';
import { TaskType } from 'src/modules/task type/schema/task.-type.schema';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: Types.ObjectId, required: true, ref: TaskType.name })
    task_type: Types.ObjectId;

    @Prop({ required: true })
    priority: number;

    @Prop({ type: Types.ObjectId, required: true, ref: Emp.name })
    emp: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: TaskStatus.name })
    status: Types.ObjectId;

    @Prop({ type: Date })
    createdAt?: Date;

    @Prop({ type: Date })
    updatedAt?: Date;

    @Prop({ type: Date, required: true })
    due_date: Date;

    @Prop({ type: [String], default: [] })
    files: string[];

    @Prop({ type: Boolean, default: false })
    isRecurring: boolean;

    @Prop({ type: Date, default: null })
    end_date?: Date;

    @Prop({ type: Number, default: 1 })
    intervalInDays?: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
