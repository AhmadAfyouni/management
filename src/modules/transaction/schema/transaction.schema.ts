import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Query, Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from 'src/modules/department/schema/department.schema';
import { DepartmentExecutionStatus, DepartmentScheduleStatus, TransactionAction, TransactionStatus } from '../types/transaction.enum';
import { Template } from 'src/modules/template/schema/tamplate.schema';
import { DepartmentExecution, DepartmentSchedule } from 'src/modules/template/interfaces/transaction-field.interface';
import { Emp } from 'src/modules/emp/schemas/emp.schema';



@Schema({
    timestamps: true, toObject: { virtuals: true },
    toJSON: { virtuals: true }
})
class DepartmentScheduleSchema {

    _id: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Department.name,
    })
    department_id: string;

    @Prop({ enum: DepartmentScheduleStatus, default: DepartmentScheduleStatus.PENDING })
    status: DepartmentScheduleStatus
}

@Schema({
    timestamps: true, toObject: { virtuals: true },
    toJSON: { virtuals: true }
})
class DepartmentExecutionSchema {

    _id: Types.ObjectId;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        required: true,
        ref: Department.name,
    })
    department_id: string;

    @Prop({ enum: DepartmentExecutionStatus, default: DepartmentExecutionStatus.NOT_SEEN })
    status: DepartmentExecutionStatus
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

@Schema({
    timestamps: true, toObject: { virtuals: true },
    toJSON: { virtuals: true }
})
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

    @Prop({ type: [DepartmentExecutionSchema], required: false })
    departments_execution: DepartmentExecution[];

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
    @Prop({ ref: Emp.name, required: true })
    transaction_owner: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isArchive: boolean;

}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {

        ret.template = ret.template_id;
        delete ret.template_id;

        if (Array.isArray(ret.departments_approval_track)) {
            ret.departments_approval_track = ret.departments_approval_track.map(item => {
                item.department = item.department_id;
                delete item.department_id;
                return item;
            });
        }

        if (Array.isArray(ret.logs)) {
            ret.logs = ret.logs.map(item => {
                item.department = item.department_id;
                delete item.department_id;
                return item;
            });
        }

        return ret;
    }
});
(<any>TransactionSchema.query).withArchived = function () {
    this.setOptions({ withArchived: true });
    return this;
};


TransactionSchema.pre(/^find/, function (this: Query<any, Transaction>, next: Function) {
    if (!this.getOptions().withArchived) {
        this.where({ isArchive: false });
    }
    next();
});


