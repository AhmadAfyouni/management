import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskStatusDocument = TaskStatus & Document;

@Schema()
export class TaskStatus {
    @Prop({type:String,required:true})
    name:string;
    @Prop({type:String,required:true})
    description:string;
}

export const TaskStatusSchema = SchemaFactory.createForClass(TaskStatus);
