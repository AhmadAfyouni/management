import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsMongoId,
    IsArray,
    ValidateNested,
    IsNumber,
} from "class-validator";
import { Type } from 'class-transformer';
import { Types } from "mongoose";

class NumericOwnerDto {
    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber()
    count: number;
}

class RequiredReportDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    templateFile: string;
}

class DevelopmentProgramDto {
    @IsString()
    @IsNotEmpty()
    programName: string;

    @IsString()
    @IsNotEmpty()
    objective: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    programFile?: string;
}

export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    goal: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsNotEmpty()
    mainTasks: string;

    @IsMongoId()
    @IsOptional()
    manager?: Types.ObjectId;

    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NumericOwnerDto)
    @IsOptional()
    numericOwners?: NumericOwnerDto[];

    @IsArray()
    @IsOptional()
    supportingFiles?: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RequiredReportDto)
    @IsOptional()
    requiredReports?: RequiredReportDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DevelopmentProgramDto)
    @IsOptional()
    developmentPrograms?: DevelopmentProgramDto[];
}
