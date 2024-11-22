import { IsMongoId, IsOptional } from "class-validator";

export class GetTreeDto {
    @IsOptional()
    @IsMongoId()
    projectId?: string;

    @IsOptional()
    @IsMongoId()
    departmentId?: string;
}