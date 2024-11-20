import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from 'src/config/role.enum';
import { Department } from 'src/modules/department/schema/department.schema';
import { JobTitles } from 'src/modules/job-titles/schema/job-ttiles.schema';
import { Allowance } from './allowance.schema';
import { BankAccount } from './bankAccount.schema';
import { Certification } from './certification.schema';
import { Evaluation } from './evaluation.schema';
import { Incentive } from './incentive.schema';
import { LegalDocument } from './legalDocument.schema';

export type EmpDocument = Emp & Document;

@Schema({ timestamps: true })
export class Emp {
    _id: Types.ObjectId;

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

    @Prop({ type: [LegalDocument], default: [] })
    legal_documents: LegalDocument[];

    @Prop({ type: [Certification], default: [] })
    certifications: Certification[];

    @Prop({ type: Types.ObjectId, required: true, ref: JobTitles.name })
    job_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: "Department" })
    department_id: Types.ObjectId;

    @Prop({ required: true })
    employment_date: Date;

    @Prop({ type: String })
    job_tasks?: string;

    @Prop({ required: true })
    base_salary: number;

    @Prop({ type: [Allowance], default: [] })
    allowances: Allowance[];

    @Prop({ type: [Incentive], default: [] })
    incentives: Incentive[];

    @Prop({ type: [BankAccount], default: [] })
    bank_accounts: BankAccount[];

    @Prop({ type: [Evaluation], default: [] })
    evaluations: Evaluation[];

    @Prop({ required: true })
    password: string;

    @Prop({ type: Boolean, default: false })
    changed_password: boolean;

    @Prop({ type: String, enum: UserRole, required: true, default: UserRole.SECONDARY_USER })
    role: UserRole;
    @Prop()
    parentId?: string;
}

export const EmpSchema = SchemaFactory.createForClass(Emp);
