import { IsNotEmpty, IsString, IsMongoId, IsArray, IsDateString, IsOptional } from 'class-validator';

export class CreateInternalCommunicationDto {
    @IsNotEmpty()
    @IsMongoId()
    emp_id: string;

    @IsNotEmpty()
    @IsMongoId()
    department_id: string;

    @IsNotEmpty()
    @IsString()
    message_body: string;

    @IsOptional()
    @IsArray()
    files: string[];
}
