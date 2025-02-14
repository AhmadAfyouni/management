import { IsEnum, IsMongoId, IsArray, ValidateNested, IsOptional, IsString, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { DepartmentScheduleStatus } from '../types/transaction.enum';


export class DepartmentScheduleDto {
    @IsMongoId()
    department_id: string;


    @IsEnum(DepartmentScheduleStatus)
    @IsOptional()
    status: DepartmentScheduleStatus
}


export class TransactionFieldDto {
    @IsString()
    @IsNotEmpty()
    field_name: string;

    @IsNotEmpty()
    value: string | number | Buffer;
}

export class CreateTransactionDto {

    @IsMongoId()
    template_id: string;

    @IsString()
    start_date: string;

    @ValidateNested({ each: true })
    @Type(() => TransactionFieldDto)
    @ArrayNotEmpty()
    fields: TransactionFieldDto[];
}
