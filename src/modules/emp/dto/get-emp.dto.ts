import { GetJobTitlesDto } from "src/modules/job-titles/dto/get-job-titles.dro";

export class GetEmpDto {
    id: string;
    name: string;
    national_id: string;
    dob: Date;
    gender: string;
    marital_status: string;
    phone: string;
    email: string;
    address: string;
    emergency_contact?: string;
    legal_documents: Array<{ name: string; validity: Date; file: string }>;
    certifications: Array<{ certificate_name: string; date: Date; grade: string; file: string }>;
    employment_date: Date;
    department: any;
    job?: any;
    supervisor?: { id: string; name: string };
    job_tasks?: string;
    base_salary: number;
    allowances: Array<{ type: string; amount: number }>;
    incentives: Array<{ description: string; amount: number }>;
    bank_accounts: Array<{ bank_name: string; account_number: string }>;
    evaluations: Array<{ type: string; description: string; plan: string }>;

    constructor(emp: any) {
        this.id = emp._id.toString();
        this.name = emp.name;
        this.national_id = emp.national_id;
        this.dob = emp.dob;
        this.gender = emp.gender;
        this.marital_status = emp.marital_status;
        this.phone = emp.phone;
        this.email = emp.email;
        this.address = emp.address;
        this.emergency_contact = emp.emergency_contact;
        this.legal_documents = emp.legal_documents || [];
        this.certifications = emp.certifications || [];
        this.employment_date = emp.employment_date;
        this.department = {
            name: emp.department_id.name,
            id: emp.department_id._id.toString()
        };
        this.job = emp.job_id ? new GetJobTitlesDto(emp.job_id) : null;
        this.supervisor = emp.supervisor_id ? {
            id: emp.supervisor_id._id.toString(),
            name: emp.supervisor_id.name
        } : undefined;
        this.job_tasks = emp.job_tasks;
        this.base_salary = emp.base_salary;
        this.allowances = emp.allowances || [];
        this.incentives = emp.incentives || [];
        this.bank_accounts = emp.bank_accounts || [];
        this.evaluations = emp.evaluations || [];
    }
}
