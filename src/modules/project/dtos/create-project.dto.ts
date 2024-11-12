import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional, Matches } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsArray()
    @IsMongoId({ each: true })
    departments: string[];

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    members: string[];

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{4}[-/]\d{2}[-/]\d{2}$/, { message: 'startDate must be in YYYY-MM-DD or YYYY/MM/DD format' })
    startDate: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^\d{4}[-/]\d{2}[-/]\d{2}$/, { message: 'endDate must be in YYYY-MM-DD or YYYY/MM/DD format' })
    endDate: string;
}
