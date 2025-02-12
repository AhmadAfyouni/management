import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { DepartmentScheduleStatus, TransactionStatus } from '../types/transaction.enum';
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
}

@Schema({ timestamps: true })
export class Transaction extends Document {

    _id: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Template.name
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

}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
