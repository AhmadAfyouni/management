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


