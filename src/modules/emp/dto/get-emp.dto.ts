import { Types } from "mongoose";

export class GetEmpDto {
    _id: string;
    name: string;
    dob: Date;
    phone: string;
    email: string;
    address: string;
    employment_date: Date;
    department: any;
    job: any;

    constructor(emp: any) {
        this._id = emp._id.toString();
        this.name = emp.name;
        this.address = emp.address;
        this.department = emp.department_id;
        this.dob = emp.dob;
        this.job = emp.job_id;
        this.phone = emp.phone;
        this.email= emp.email;
    }
}