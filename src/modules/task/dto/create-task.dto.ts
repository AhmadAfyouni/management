import { IsString, IsNotEmpty, IsMongoId, IsDate, IsInt, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsMongoId()
    @IsNotEmpty()
    task_type: string;

    @IsInt()
    @IsNotEmpty()
    priority: number;

    @IsMongoId()
    @IsOptional()
    emp: string;

    @IsMongoId()
    @IsOptional()
    department_id: string;

    @IsMongoId()
    @IsNotEmpty()
    status: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    due_date: Date;

    @IsArray()
    @IsString({ each: true })
    files?: string[];
}
