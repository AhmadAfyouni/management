import { IsArray, IsNotEmpty, IsString } from "class-validator";
import { GetDepartmentDto } from "../../../modules/department/dto/get-department.dto";

export class GetJobTitlesDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    grade_level: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsArray()
    @IsString({ each: true })
    responsibilities: string[];

    @IsArray()
    @IsString({ each: true })
    permissions: string[];


    department: GetDepartmentDto;

    constructor(jobTitles: any) {
        this.name = jobTitles.name;
        this.title = jobTitles.title;
        this.department = jobTitles.department;
        this.grade_level = jobTitles.grade_level;
        this.description = jobTitles.description;
        this.responsibilities = jobTitles.responsibilities;
        this.permissions = jobTitles.permissions;
        this.department = new GetDepartmentDto(jobTitles.department_id);
    }

}