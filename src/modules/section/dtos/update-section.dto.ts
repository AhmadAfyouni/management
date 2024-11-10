import { IsString, IsOptional } from 'class-validator';

export class UpdateSectionDto {
    @IsString()
    @IsOptional()
    name?: string;
}
