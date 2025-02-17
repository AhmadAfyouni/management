import { DepartmentExecutionStatus, DepartmentScheduleStatus } from 'src/modules/transaction/types/transaction.enum';
import { DurationUnit, FieldType } from '../types/field.enum';

export interface TransactionField {
    name: string;
    type: FieldType;
}

export interface Duration {
    unit: DurationUnit;
    value: number;
}


export interface DepartmentSchedule {
    department_id: string;
    status: DepartmentScheduleStatus;
}

export interface DepartmentExecution {
    department_id: string;
    status: DepartmentExecutionStatus;
}