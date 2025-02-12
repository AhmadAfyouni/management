import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { TransactionField } from '../interfaces/transaction-field.interface';
import { DurationUnit, FieldType } from '../types/field.enum';

@Schema({ timestamps: true })
export class Template extends Document {

    _id: Types.ObjectId;
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ required: true })
    type: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: Department.name }], required: true })
    departments_approval_track: string[];

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: Department.name }], required: true })
    departments_excuation_ids: string[];

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
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
