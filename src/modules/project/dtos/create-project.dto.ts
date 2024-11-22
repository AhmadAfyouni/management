import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, Matches } from 'class-validator';

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

    @IsString()
    @IsNotEmpty()
    startDate: string;

    @IsString()
    @IsNotEmpty()
    endDate: string;
}
