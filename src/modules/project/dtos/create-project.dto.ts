import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, Matches, IsDate, IsEnum, IsNumber, IsHexColor } from 'class-validator';
import { ProjectStatus } from '../enums/project-status';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsMongoId()
    @IsOptional()
    assignee?: string;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    departments: string[];

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    members: string[];

    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    endDate: Date;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status: ProjectStatus;

    @IsOptional()
    @IsNumber()
    rate?: number;

    @IsOptional()
    @IsHexColor()
    color: string;
}
