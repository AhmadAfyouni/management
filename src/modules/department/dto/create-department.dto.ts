import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEnum, IsInt, IsArray } from "class-validator";
import { Types } from "mongoose";

export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    goal: string;

    @IsNotEmpty()
    category: string;

    @IsString()
    @IsNotEmpty()
    mainTasks: string;
    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId | null;

    @IsArray()
    @IsOptional()
    numericOwners?: { category: string, count: number }[];

    @IsArray()
    @IsOptional()
    supportingFiles?: string[];

    @IsArray()
    @IsOptional()
    requiredReports?: { name: string, templateFile: string }[];

    @IsArray()
    @IsOptional()
    developmentPrograms?: { programName: string, objective: string, notes?: string, programFile?: string }[];
}
