import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TransactionField } from '../interfaces/transaction-field.interface';
import { DurationUnit, FieldType } from '../types/field.enum';
import { DepartmentAssignment, DepartmentAssignmentSchema } from './department-assigne.schem';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Emp } from 'src/modules/emp/schemas/emp.schema';



@Schema({ timestamps: true })
export class Template extends Document {

    _id: Types.ObjectId;
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ required: true })
    type: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [DepartmentAssignmentSchema], required: true })
    departments_approval_track: DepartmentAssignment[];

    @Prop({ type: [DepartmentAssignmentSchema], required: true })
    departments_execution_ids: DepartmentAssignment[];

    @Prop({ type: [DepartmentAssignmentSchema], required: true })
    departments_archive: DepartmentAssignment[];

    @Prop({
        type: [{
            name: { type: String, required: true },
            type: { type: String, enum: Object.values(FieldType), required: true }
        }],
        required: true
    })
    transactionFields: TransactionField[];

    @Prop({ required: false, default: false })
    needAdminApproval?: boolean;
    @Prop({
        type: {
            unit: {
                type: String,
                enum: Object.values(DurationUnit),
                required: true
            },
            value: {
                type: Number,
                required: true,
                min: 1
            },
        },
        required: true,
    })
    duration: {
        unit: DurationUnit;
        value: number;
    };

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Emp.name, required: false })
    admin_approve?: Types.ObjectId;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);