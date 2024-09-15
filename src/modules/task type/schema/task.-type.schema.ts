import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskTypeDocument = TaskType & Document;

@Schema()
export class TaskType {
    @Prop({type:String,required:true})
    name:string;
    @Prop({type:String,required:true})
    description:string;
}

export const TaskTypeSchema = SchemaFactory.createForClass(TaskType);
