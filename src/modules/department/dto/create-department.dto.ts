import { IsMongoId, IsOptional } from "class-validator";
import { Types } from "mongoose";

export class CreateDepartmentDto {
    name: string;
    description: string;
    @IsMongoId()
    @IsOptional()
    parent_department_id?: Types.ObjectId | null;
}