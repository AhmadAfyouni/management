import { IsMongoId, IsDate, IsEmail, IsPhoneNumber, IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from "class-validator";
import { Type } from 'class-transformer';
import { Types } from "mongoose";

export class LegalDocumentDto {
    @IsString()
    name: string;

    @IsDate()
    @Type(() => Date)
    validity: Date;

    @IsString()
    file: string;
}

export class CertificationDto {
    @IsString()
    certificate_name: string;

    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsString()
    grade: string;

    @IsString()
    file: string;
}
export class AllowanceDto {
    @IsString()
    allowance_type: string;

    @IsNumber()
    amount: number;
}




export class IncentiveDto {
    @IsString()
    description: string;

    @IsNumber()
    amount: number;
}

export class BankAccountDto {
    @IsString()
    bank_name: string;

    @IsString()
    account_number: string;
}


export class EvaluationDto {
    @IsString()
    evaluation_type: string;

    @IsString()
    description: string;

    @IsString()
    plan: string;
}


export class CreateEmpDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    national_id: string;

    @IsDate()
    @Type(() => Date)
    dob: Date;

    @IsString()
    gender: string;

    @IsString()
    marital_status: string;

    @IsPhoneNumber()
    phone: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsOptional()
    emergency_contact?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LegalDocumentDto)
    legal_documents?: LegalDocumentDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CertificationDto)
    certifications?: CertificationDto[];

    @IsMongoId()
    department_id: Types.ObjectId;

    @IsMongoId()
    job_id: Types.ObjectId;

    @IsDate()
    @Type(() => Date)
    employment_date: Date;

    @IsMongoId()
    @IsOptional()
    supervisor_id?: Types.ObjectId;

    @IsString()
    @IsOptional()
    job_tasks?: string;

    @IsNumber()
    base_salary: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllowanceDto)
    allowances?: AllowanceDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IncentiveDto)
    incentives?: IncentiveDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankAccountDto)
    bank_accounts?: BankAccountDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvaluationDto)
    evaluations?: EvaluationDto[];
}
