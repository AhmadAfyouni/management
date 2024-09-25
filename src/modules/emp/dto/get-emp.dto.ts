import { GetJobTitlesDto } from "src/modules/job-titles/dto/get-job-titles.dro";

export class GetEmpDto {
    _id: string;
    name: string;
    dob: Date;
    phone: string;
    email: string;
    address: string;
    employment_date: Date;
    department: any;
    job?: any;

    constructor(emp: any) {
        console.log(emp.jobTitle);
        
        this._id = emp._id.toString();
        this.name = emp.name;
        this.address = emp.address;
        this.department = emp.department_id;
        this.dob = emp.dob;
        this.job = new GetJobTitlesDto(emp.jobTitle);
        this.phone = emp.phone;
        this.email = emp.email;
    }
}