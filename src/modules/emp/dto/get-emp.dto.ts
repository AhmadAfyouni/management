import { Types } from "mongoose";

export class GetEmpDto {
    name: string;
    dob: Date;
    phone: string;
    email: string;
    address: string;
    employment_date: Date;
    department: any;
    job: any;

    constructor(emp: any) {
        this.name = emp.name;
        this.address = emp.address;
        this.department = emp.department_id;
        this.dob = emp.dob;
        this.job = emp.job_id;
        this.phone = emp.phone;
    }
}