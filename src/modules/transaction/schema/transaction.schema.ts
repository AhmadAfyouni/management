import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { DepartmentScheduleStatus, TransactionAction, TransactionStatus } from '../types/transaction.enum';
import { Template } from 'src/modules/template/schema/tamplate.schema';
import { DepartmentSchedule } from 'src/modules/template/interfaces/transaction-field.interface';



@Schema({ timestamps: true })
class DepartmentScheduleSchema {

    _id: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Department.name
    })
    department_id: string;

    @Prop({ enum: DepartmentScheduleStatus, default: DepartmentScheduleStatus.PENDING })
    status: DepartmentScheduleStatus
}

@Schema()
class TransactionFieldSchema {
    @Prop({ required: true })
    field_name: string;

    @Prop({ required: true, type: MongooseSchema.Types.Mixed })
    value: any;
}

@Schema({ timestamps: true })
class TransactionLogSchema {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Department.name
    })
    department_id: string;

    @Prop({ required: true })
    finished_at: string;

    @Prop({ required: true })
    note: string;

    @Prop({ enum: TransactionAction })
    action?: TransactionAction
}

@Schema({ timestamps: true })
export class Transaction extends Document {

    _id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        required: true,
        ref: Template.name,
        alias: 'template'
    })
    template_id: string;


    @Prop({ default: Date.now() })
    start_date: string;

    @Prop({ type: [DepartmentScheduleSchema], required: true })
    departments_approval_track: DepartmentSchedule[];

    @Prop({
        type: String,
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.NOT_APPROVED
    })
    status: TransactionStatus;

    @Prop({ type: [TransactionLogSchema], default: [] })
    logs: TransactionLogSchema[];

    @Prop({
        type: [TransactionFieldSchema],
        required: true,
        validate: {
            validator: function (fields) {
                return Array.isArray(fields) && fields.length > 0;
            },
            message: 'Fields array cannot be empty'
        }
    })
    fields: {
        field_name: string;
        value: string | number | Buffer;
    }[];

}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
