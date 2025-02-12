import { IsEnum, IsMongoId, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DepartmentScheduleStatus } from '../types/transaction.enum';


export class DepartmentScheduleDto {
    @IsMongoId()
    department_id: string;


    @IsEnum(DepartmentScheduleStatus)
    @IsOptional()
    status: DepartmentScheduleStatus
}

export class CreateTransactionDto {

    @IsMongoId()
    template_id: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DepartmentScheduleDto)
    departments_approval_track: DepartmentScheduleDto[];

}
