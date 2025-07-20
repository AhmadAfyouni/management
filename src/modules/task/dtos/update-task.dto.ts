import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {

    @IsOptional()
    @IsNumber()
    rate?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsNumber()
    @IsOptional()
    actual_hours?: number;
}
