import { IsMongoId, IsOptional } from "class-validator";
import { Types } from "mongoose";

export class GetDepartmentDto {
    name: string;
    description: string;
    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId | null | GetDepartmentDto;
    constructor(dept: any) {
        this.name = dept.name;
        this.description = dept.description;
        this.parent_department_id =dept.parent_department_id!=null ? new GetDepartmentDto(dept.parent_department_id) : null;
    }
}