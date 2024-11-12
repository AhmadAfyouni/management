import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsMongoId()
    project?: string;

    @IsOptional()
    @IsMongoId()
    department?: string;
}
