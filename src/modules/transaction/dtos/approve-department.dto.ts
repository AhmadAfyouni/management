import { IsString, IsNotEmpty, IsMongoId, IsEnum } from 'class-validator';
import { DepartmentScheduleStatus } from '../types/transaction.enum';

export class ApproveDepartmentDto {
    @IsMongoId()
    department_id: string;

    @IsEnum(DepartmentScheduleStatus)
    status: DepartmentScheduleStatus;

    @IsString()
    @IsNotEmpty()
    note: string;
}

