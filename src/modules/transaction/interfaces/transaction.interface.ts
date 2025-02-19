import { Types } from "mongoose";
import { DepartmentExecutionStatus, DepartmentScheduleStatus } from "../types/transaction.enum";

export interface TransactionLog {
    department_id: string;
    finished_at: string;
    note: string;
}
export interface DepartmentSchedule {
    department_id: Types.ObjectId;
    employee?:Types.ObjectId;
    status: DepartmentScheduleStatus;
}

export interface DepartmentExecution {
    department_id: Types.ObjectId;
    employee?:Types.ObjectId;
    status: DepartmentExecutionStatus;
}

export interface DepartmentsArchive {
    department_id: Types.ObjectId;
    employee?:Types.ObjectId;
}