import { IsString, IsNotEmpty, IsMongoId, IsDate, IsInt, IsArray, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TASK_STATUS } from '../enums/task-status.enum';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsInt()
    @IsNotEmpty()
    priority: number;

    @IsMongoId()
    @IsOptional()
    emp?: string;

    @IsMongoId()
    @IsOptional()
    department_id?: string;

    @IsNotEmpty()
    @IsEnum(TASK_STATUS)
    status: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    due_date: Date;

    @IsArray()
    @IsString({ each: true })
    files?: string[];

    @IsBoolean()
    @IsOptional()
    isRecurring?: boolean;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    end_date?: Date;

    @IsInt()
    @IsOptional()
    intervalInDays?: number;
}
