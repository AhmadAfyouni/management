import { IsNotEmpty, IsString, IsMongoId, IsArray, IsDateString, IsOptional } from 'class-validator';

export class CreateInternalCommunicationDto {
    @IsNotEmpty()
    @IsString()
    message: string;

    @IsOptional()
    @IsArray()
    files: string[];
}
