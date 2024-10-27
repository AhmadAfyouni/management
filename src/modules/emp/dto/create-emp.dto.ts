import {
    IsMongoId,
    IsDate,
    IsEmail,
    IsPhoneNumber,
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    IsEnum,
} from "class-validator";
import { Type } from 'class-transformer';
import { Types } from "mongoose";

export class LegalDocumentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDate()
    @Type(() => Date)
    validity: Date;

    @IsString()
    @IsNotEmpty()
    file: string;
}

export class CertificationDto {
    @IsString()
    @IsNotEmpty()
    certificate_name: string;

    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsString()
    @IsOptional()
    grade: string;

    @IsString()
    @IsOptional()
    file: string;
}

export class AllowanceDto {
    @IsString()
    @IsNotEmpty()
    allowance_type: string;

    @IsNumber()
    amount: number;
}

export class IncentiveDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    amount: number;
}

export class BankAccountDto {
    @IsString()
    @IsNotEmpty()
    bank_name: string;

    @IsString()
    @IsNotEmpty()
    account_number: string;
}

export class EvaluationDto {
    @IsString()
    @IsNotEmpty()
    evaluation_type: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
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
    @IsNotEmpty()
    gender: string;

    @IsString()
    @IsNotEmpty()
    marital_status: string;

    @IsPhoneNumber()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    @IsNotEmpty()
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
    @IsOptional()
    legal_documents?: LegalDocumentDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CertificationDto)
    @IsOptional()
    certifications?: CertificationDto[];

    @IsMongoId()
    @IsNotEmpty()
    job_id: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    department_id: Types.ObjectId;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    employment_date: Date;

    @IsString()
    @IsOptional()
    job_tasks?: string;

    @IsNumber()
    @IsNotEmpty()
    base_salary: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllowanceDto)
    @IsOptional()
    allowances?: AllowanceDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IncentiveDto)
    @IsOptional()
    incentives?: IncentiveDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankAccountDto)
    @IsOptional()
    bank_accounts?: BankAccountDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvaluationDto)
    @IsOptional()
    evaluations?: EvaluationDto[];
}
