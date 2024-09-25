import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { Emp } from 'src/modules/emp/schema/emp.schema';

export type InternalCommunicationsDocument = InternalCommunications & Document;

@Schema({ timestamps: true })
export class InternalCommunications {
    @Prop({ type: Types.ObjectId, required: true, ref: Emp.name })
    emp_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: Department.name })
    department_id: Types.ObjectId;

    @Prop({ type: String, required: true })
    message_body: string;

    @Prop({ type: Date })
    createdAt?: Date;

    @Prop({ type: [String], default: [] })
    files: string[];
}

export const InternalCommunicationsSchema = SchemaFactory.createForClass(InternalCommunications);
