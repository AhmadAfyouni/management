import { GetDepartmentDto, GetDepartmentTaskDto } from "src/modules/department/dto/get-department.dto";
import { GetJobTitlesDto } from "src/modules/job-titles/dto/get-job-titles.dro";

export class GetEmpDto {
    id: string;
    name: string;
    dob: Date;
    phone: string;
    email: string;
    address: string;
    employment_date: Date;
    department: any;
    job?: any;

    constructor(emp: any) {        
        this.id = emp._id.toString();
        this.name = emp.name;
        this.address = emp.address;
        this.department = {
            name: emp.department_id.name,
            id: emp.department_id._id.toString()
        };
        this.dob = emp.dob;
        this.job = new GetJobTitlesDto(emp.job_id);
        this.phone = emp.phone;
        this.email = emp.email;
    }
}