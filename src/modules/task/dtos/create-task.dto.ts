import { IsString, IsNotEmpty, IsMongoId, IsDate, IsInt, IsArray, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { TASK_STATUS } from '../enums/task-status.enum';
import { PRIORITY_TYPE } from '../enums/priority.enum';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(PRIORITY_TYPE)
    @IsString()
    priority: PRIORITY_TYPE;

    @IsMongoId()
    @IsOptional()
    emp?: string;

    @IsMongoId()
    @IsOptional()
    project_id?: string;

    @IsMongoId()
    @IsOptional()
    department_id?: string;

    @IsNotEmpty()
    @IsEnum(TASK_STATUS)
    @IsOptional()
    status: TASK_STATUS;

    @IsMongoId()
    @IsOptional()
    assignee?: string;

    @IsMongoId()
    @IsOptional()
    section_id?: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    due_date: Date;

    // Enhanced date fields for better progress calculation
    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    start_date: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    actual_end_date?: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    expected_end_date?: Date;

    // Enhanced time tracking fields
    @IsNumber()
    @IsOptional()
    estimated_hours?: number;



    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    files?: string[];

    // Recurring task enhancements
    @IsBoolean()
    @IsOptional()
    isRecurring?: boolean;

    @IsString()
    @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
    @IsOptional()
    recurringType?: string;

    @IsInt()
    @IsOptional()
    intervalInDays?: number;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    recurringEndDate?: Date;

    @IsBoolean()
    @IsOptional()
    isRoutineTask?: boolean;

    @IsString()
    @IsOptional()
    routineTaskId?: string;

    // Progress calculation method
    @IsString()
    @IsEnum(['time_based', 'date_based'])
    @IsOptional()
    progressCalculationMethod?: string;

    // Task relationships
    @IsMongoId()
    @IsOptional()
    parent_task?: string;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    end_date?: Date;

}

export class CreateSubTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(PRIORITY_TYPE)
    @IsString()
    priority: PRIORITY_TYPE;

    @IsMongoId()
    @IsOptional()
    emp?: string; // اختياري - إذا لم يتم تحديده، سيتم استخدام موظف المهمة الأب

    @IsMongoId()
    @IsOptional()
    assignee?: string; // اختياري - الموظف المُسند إليه المهمة الفرعية

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    due_date: Date;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    start_date: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    actual_end_date?: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    expected_end_date?: Date;

    @IsNumber()
    @IsOptional()
    estimated_hours?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    files?: string[];

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    recurringEndDate?: Date;

    @IsString()
    @IsEnum(['time_based', 'date_based'])
    @IsOptional()
    progressCalculationMethod?: string;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    end_date?: Date;
}

