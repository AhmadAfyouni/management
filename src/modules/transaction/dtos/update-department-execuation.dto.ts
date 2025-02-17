import { IsEnum } from 'class-validator';
import { DepartmentExecutionStatus } from '../types/transaction.enum';

export class UpdateDepartmentExecutionStatusDto {
    @IsEnum(DepartmentExecutionStatus, {
        message: 'newStatus must be a valid DepartmentExecutionStatus',
    })
    newStatus: DepartmentExecutionStatus;
}
