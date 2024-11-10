import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsMongoId()
    project: string;
}
