import { IsString, IsNotEmpty, IsMongoId, IsDate, IsInt, IsArray } from 'class-validator';
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
    @IsNotEmpty()
    emp: string;

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
