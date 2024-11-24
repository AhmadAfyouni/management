import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, Matches, IsDate } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;


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
}
