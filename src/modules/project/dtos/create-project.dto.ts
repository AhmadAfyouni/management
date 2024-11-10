import { IsString, IsNotEmpty, IsArray, IsMongoId, IsOptional } from 'class-validator';

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
}
