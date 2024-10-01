import { IsMongoId, IsOptional } from "class-validator";
import { Types } from "mongoose";

export class GetDepartmentDto {
    id: string
    name: string;
    description: string;
    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId | null | GetDepartmentDto;
    constructor(dept: any) {
        this.id = dept._id;
        this.name = dept.name;
        this.description = dept.description;
        this.parent_department_id = dept.parent_department_id != null ? new GetDepartmentDto(dept.parent_department_id) : null;
    }
}

export class GetDepartmentTaskDto {
    id: string
    name: string;
    constructor(dept: any) {
        this.id = dept._id;
        this.name = dept.name;
    }
}