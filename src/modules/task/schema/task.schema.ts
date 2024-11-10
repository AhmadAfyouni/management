import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Emp } from 'src/modules/emp/schemas/emp.schema';
import { TaskStatus } from '../enums/task-status.enum';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;


    @Prop({ required: true })
    priority: number;

    @Prop({ type: Types.ObjectId, required: true, ref: Emp.name })
    emp: Types.ObjectId;

    @Prop({ type: String, enum: TaskStatus, required: true, default: TaskStatus.PENDING })
    status: TaskStatus;

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

    @Prop({ type: Types.ObjectId, required: true, ref: "Department" })
    department_id: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
