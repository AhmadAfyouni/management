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
    templateFile: string; // Can be either file URL or file ID
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
    programFile?: string; // Can be either file URL or file ID
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

    @IsOptional()
    @IsString()
    parent_department_id?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NumericOwnerDto)
    @IsOptional()
    numericOwners?: NumericOwnerDto[];

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    supportingFiles?: string[]; // Can be either file URLs or file IDs

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
