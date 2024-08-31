import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema()
export class Department {
    @Prop({ required: true, })
    name: string;

    @Prop({ required: true})
    description: string;


    @Prop({ type: Types.ObjectId, required: false, ref: "Department" })
    parent_department_id?: Types.ObjectId | null
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
