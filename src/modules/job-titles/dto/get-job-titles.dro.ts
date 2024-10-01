import { GetDepartmentDto } from "../../../modules/department/dto/get-department.dto";

export class GetJobTitlesDto {
    id: string;
    name: string;
    title: string;
    grade_level: string;
    description: string;
    responsibilities: string[];
    permissions: string[];
    department: GetDepartmentDto;
    constructor(jobTitles: any) {
        this.id = jobTitles._id.toString();
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