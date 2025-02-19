import { IsString, IsArray, IsNotEmpty, ValidateNested, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { DurationDto } from './department-schedule.dto';
import { TransactionFieldDto } from './transaction-field.dto';
import { DepartmentAssignmentDto } from './department-assignment.dto';

export class CreateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DepartmentAssignmentDto)
    departments_approval_track: DepartmentAssignmentDto[];
  

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DepartmentAssignmentDto)
    departments_execution_ids: DepartmentAssignmentDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransactionFieldDto)
    transactionFields: TransactionFieldDto[];

    @IsBoolean()
    @IsOptional()
    needAdminApproval: boolean;

    @ValidateNested()
    @Type(() => DurationDto)
    duration: DurationDto;

}
