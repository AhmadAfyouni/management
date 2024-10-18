import { IsMongoId, IsOptional } from "class-validator";
import { Types } from "mongoose";

export class GetDepartmentDto {
    id: string;
    name: string;
    goal: string;
    category: string;
    mainTasks: string;
    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId | null | GetDepartmentDto;
    numericOwners?: { category: string, count: number }[];
    supportingFiles?: string[];
    requiredReports?: { name: string, templateFile: string }[];
    developmentPrograms?: { programName: string, objective: string, notes?: string, programFile?: string }[];

    constructor(dept: any) {
        this.id = dept._id;
        this.name = dept.name;
        this.goal = dept.goal;
        this.category = dept.category;
        this.mainTasks = dept.mainTasks;
        this.parent_department_id = dept.parent_department_id ? new GetDepartmentDto(dept.parent_department_id) : null;
        this.numericOwners = dept.numericOwners;
        this.supportingFiles = dept.supportingFiles;
        this.requiredReports = dept.requiredReports;
        this.developmentPrograms = dept.developmentPrograms;
    }
}
