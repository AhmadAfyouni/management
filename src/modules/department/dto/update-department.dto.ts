import { PartialType } from '@nestjs/mapped-types';
import { CreateDepartmentDto } from './create-department.dto';
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

class NumericOwnerDto {
    @IsString()
    category: string;

    @IsNumber()
    count: number;
}

class RequiredReportDto {
    @IsString()
    name: string;

    @IsString()
    templateFile: string; // Can be either file URL or file ID
}

class DevelopmentProgramDto {
    @IsString()
    programName: string;

    @IsString()
    objective: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    programFile?: string; // Can be either file URL or file ID
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    goal?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    mainTasks?: string;

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
