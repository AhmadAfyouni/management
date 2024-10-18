import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmpDocument = Emp & Document;

@Schema({ timestamps: true })
export class Emp {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    national_id: string;

    @Prop({ required: true })
    dob: Date;

    @Prop({ required: true })
    gender: string;

    @Prop({ required: true })
    marital_status: string;

    @Prop({ required: true, unique: true })
    phone: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    address: string;

    @Prop()
    emergency_contact?: string;

    @Prop({ type: [{ name: String, validity: Date, file: String }], default: [] })
    legal_documents: Array<{ name: string; validity: Date; file: string }>;

    @Prop({ type: [{ certificate_name: String, date: Date, grade: String, file: String }], default: [] })
    certifications: Array<{ certificate_name: string; date: Date; grade: string; file: string }>;

    @Prop({ type: Types.ObjectId, required: true, ref: "JobTitles" })
    job_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: "Department" })
    department_id: Types.ObjectId;

    @Prop({ required: true })
    employment_date: Date;

    @Prop({ type: Types.ObjectId, ref: "Emp" })
    supervisor_id?: Types.ObjectId;

    @Prop()
    job_tasks?: string;

    @Prop({ required: true })
    base_salary: number;

    @Prop({ type: [{ allowance_type: String, amount: Number }], default: [] })
    allowances: Array<{ allowance_type: string; amount: number }>;

    @Prop({ type: [{ description: String, amount: Number }], default: [] })
    incentives: Array<{ description: string; amount: number }>;

    @Prop({ type: [{ bank_name: String, account_number: String }], default: [] })
    bank_accounts: Array<{ bank_name: string; account_number: string }>;

    @Prop({ type: [{ evaluation_type: String, description: String, plan: String }], default: [] })
    evaluations: Array<{ evaluation_type: string; description: string; plan: string }>;

    @Prop({ required: true })
    password: string;

    @Prop({ type: Boolean, default: false })
    changed_password: boolean;
}

export const EmpSchema = SchemaFactory.createForClass(Emp);
