import { Types } from 'mongoose';
import { IsMongoId, IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { DepartmentDocument } from '../schema/department.schema';

class NumericOwnerDto {
    @IsString()
    category: string;

    @IsNumber()
    count: number;

    constructor(category: string, count: number) {
        this.category = category;
        this.count = count;
    }
}

class RequiredReportDto {
    @IsString()
    name: string;

    @IsString()
    templateFile: string;

    constructor(name: string, templateFile: string) {
        this.name = name;
        this.templateFile = templateFile;
    }
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
    programFile?: string;

    constructor(programName: string, objective: string, notes?: string, programFile?: string) {
        this.programName = programName;
        this.objective = objective;
        this.notes = notes;
        this.programFile = programFile;
    }
}

export class GetDepartmentDto {
    @IsMongoId()
    id: string;

    @IsString()
    name: string;

    @IsString()
    goal: string;

    @IsString()
    category: string;

    @IsString()
    mainTasks: string;

    @IsMongoId()
    @IsOptional()
    parent_department?: Types.ObjectId;

    @IsArray()
    numericOwners: NumericOwnerDto[];

    @IsArray()
    supportingFiles: string[];

    @IsArray()
    requiredReports: RequiredReportDto[];

    @IsArray()
    developmentPrograms: DevelopmentProgramDto[];

    constructor(department: DepartmentDocument) {
        this.id = department._id.toString();
        this.name = department.name;
        this.goal = department.goal;
        this.category = department.category;
        this.mainTasks = department.mainTasks;
        this.parent_department = department.parent_department_id;
        this.numericOwners = department.numericOwners.map(
            (owner) => new NumericOwnerDto(owner.category, owner.count)
        );
        this.supportingFiles = department.supportingFiles;
        this.requiredReports = department.requiredReports.map(
            (report) => new RequiredReportDto(report.name, report.templateFile)
        );
        this.developmentPrograms = department.developmentPrograms.map(
            (program) => new DevelopmentProgramDto(program.programName, program.objective, program.notes, program.programFile)
        );
    }
}
